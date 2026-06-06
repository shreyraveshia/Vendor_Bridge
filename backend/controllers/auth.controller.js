const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const ActivityLog = require('../models/ActivityLog.model');

// Helper to hash token string before storing it in MongoDB
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// HELPER FUNCTION: generateTokens(userId, role)
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE }
  );

  return { accessToken, refreshToken };
};

// HELPER FUNCTION: setTokenCookies(res, accessToken, refreshToken)
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access token cookie (15 mins)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes in ms
  });

  // Refresh token cookie (7 days)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  });
};

// FUNCTION: register(req, res, next)
const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields (firstName, lastName, email, password, role) are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    const validRoles = ['admin', 'procurement_officer', 'manager', 'vendor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user role'
      });
    }

    // Check if email already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // Create User document
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role
    });

    // Generate tokens and configure cookies
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    setTokenCookies(res, accessToken, refreshToken);

    // Save refresh token hash to user.refreshToken
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // Create ActivityLog entry
    await ActivityLog.create({
      user: user._id,
      action: 'REGISTER',
      module: 'auth',
      description: `New user registered: ${email}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      message: 'Registration successful'
    });
  } catch (error) {
    next(error);
  }
};

// FUNCTION: login(req, res, next)
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email (include password and refreshToken fields explicitly)
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens and configure cookies
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    setTokenCookies(res, accessToken, refreshToken);

    // Update user.lastLogin and user.refreshToken
    user.lastLogin = new Date();
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // Create ActivityLog entry
    await ActivityLog.create({
      user: user._id,
      action: 'LOGIN',
      module: 'auth',
      description: `User logged in: ${email}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
};

// FUNCTION: logout(req, res, next)
const logout = async (req, res, next) => {
  try {
    // Clear both cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Clear user.refreshToken in DB if user is authenticated
    if (req.user && req.user.id) {
      await User.findByIdAndUpdate(req.user.id, { $unset: { refreshToken: 1 } });

      // Create ActivityLog entry
      await ActivityLog.create({
        user: req.user.id,
        action: 'LOGOUT',
        module: 'auth',
        description: `User logged out: ${req.user.email}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// FUNCTION: refreshToken(req, res, next)
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Find user and verify that stored token matches the incoming one
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token session'
      });
    }

    const incomingHash = hashToken(token);
    if (user.refreshToken !== incomingHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token session'
      });
    }

    // Rotate tokens
    const tokens = generateTokens(user._id, user.role);
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    // Update stored refresh token
    user.refreshToken = hashToken(tokens.refreshToken);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Token refreshed'
    });
  } catch (error) {
    next(error);
  }
};

// FUNCTION: getMe(req, res, next)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// FUNCTION: updateProfile(req, res, next)
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, company, avatar } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (company !== undefined) user.company = company;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // Create ActivityLog entry
    await ActivityLog.create({
      user: user._id,
      action: 'UPDATE_PROFILE',
      module: 'auth',
      description: `User updated profile information: ${user.email}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    return res.status(200).json({
      success: true,
      user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// FUNCTION: changePassword(req, res, next)
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Retrieve user including password
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect current password'
      });
    }

    // Update password (triggers userSchema pre-save hook to re-hash)
    user.password = newPassword;
    
    // Clear all sessions (invalidate refresh tokens)
    user.refreshToken = undefined;
    
    await user.save();

    // Create ActivityLog entry
    await ActivityLog.create({
      user: user._id,
      action: 'CHANGE_PASSWORD',
      module: 'auth',
      description: `User changed account password: ${user.email}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. All active sessions invalidated.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword
};
