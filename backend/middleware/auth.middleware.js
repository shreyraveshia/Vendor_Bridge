const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Protect middleware: Verifies the access token from cookies or authorization header.
 * Attaches verified user details to req.user, blocking unauthorized access.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Read token from cookies or authorization header
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Verify access token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Token is invalid or expired.'
      });
    }

    // Retrieve user and check if active
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated'
      });
    }

    // Expose subset of user information in req.user
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize middleware factory: Asserts that the authenticated user possesses
 * one of the explicitly allowed roles.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

/**
 * OptionalAuth middleware: Resolves user identity if a valid session is active,
 * but allows the request to continue with req.user set to null if unauthenticated.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    };

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { protect, authorize, optionalAuth };
