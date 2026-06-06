import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Building2,
  ArrowRight, Briefcase
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { clsx } from 'clsx';

// ── Validation schema ──────────────────────────────────────────────────────
const schema = z.object({
  firstName:       z.string().min(2, 'First name must be at least 2 characters'),
  lastName:        z.string().min(2, 'Last name must be at least 2 characters'),
  email:           z.string().email('Enter a valid email address'),
  phone:           z.string().min(10, 'Enter a valid phone number').optional().or(z.literal('')),
  company:         z.string().min(2, 'Company name must be at least 2 characters'),
  role:            z.enum(['admin','procurement_officer','manager','vendor'], {
                     errorMap: () => ({ message: 'Please select a role' })
                   }),
  password:        z.string().min(8, 'Password must be at least 8 characters')
                             .regex(/[A-Z]/, 'Must include at least one uppercase letter')
                             .regex(/[0-9]/, 'Must include at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path:    ['confirmPassword'],
});

const ROLES = [
  { value: 'procurement_officer', label: 'Procurement Officer' },
  { value: 'manager',             label: 'Manager / Approver'  },
  { value: 'vendor',              label: 'Vendor'              },
  { value: 'admin',               label: 'Administrator'       },
];

// ── Input field component ──────────────────────────────────────────────────
function Field({ label, htmlFor, icon: Icon, error, children }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="label">{label}</label>}
      <div className="relative">
        {Icon && (
          <Icon size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
        )}
        {children}
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(schema), defaultValues: { role: '' } });

  const pwd = watch('password', '');

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...payload } = data;
      await authRegister(payload);
      toast.success('Account created successfully! Welcome to VendorBridge.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
    }
  };

  // Password strength
  const strength = [
    pwd.length >= 8,
    /[A-Z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ];
  const strengthScore = strength.filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-primary-500'][strengthScore];

  return (
    <div className="min-h-screen flex flex-row-reverse">

      {/* ── Right panel — branding (mirrored) ─────────── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] relative overflow-hidden
                      flex-col items-center justify-center p-12"
           style={{ background: 'linear-gradient(225deg, #052e16 0%, #14532d 40%, #16a34a 80%, #86efac 100%)' }}
      >
        {/* Decorative */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-10 bg-white" />
        <div className="absolute inset-0 opacity-[0.04]"
             style={{
               backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
               backgroundSize: '28px 28px'
             }}
        />

        <div className="relative z-10 max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-white/10 backdrop-blur-sm mb-6 shadow-xl border border-white/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">
            Join the<br/>
            <span className="text-green-300">Revolution</span>
          </h1>
          <p className="text-white/70 text-sm leading-relaxed mb-8">
            Create your VendorBridge account and get immediate access to your
            procurement dashboard, vendor directory, and approval workflows.
          </p>

          {/* Steps */}
          <div className="space-y-4 text-left">
            {[
              { step: '01', text: 'Create your account in under 2 minutes' },
              { step: '02', text: 'Connect with verified vendors instantly'  },
              { step: '03', text: 'Start raising RFQs and managing spend'   },
            ].map(s => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
                                border border-white/20 text-green-300 text-xs font-bold flex-shrink-0">
                  {s.step}
                </div>
                <span className="text-white/80 text-sm">{s.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 text-white/50 text-xs">
            Already have an account?{' '}
            <Link to="/login" className="text-green-300 font-semibold hover:underline">
              Sign in instead
            </Link>
          </div>
        </div>
      </div>

      {/* ── Left panel — form ──────────────────────────── */}
      <div className="flex-1 flex items-start justify-center p-6 sm:p-10
                      bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-[480px] py-8 animate-slide-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">VendorBridge</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1">
              Fill in the details below to get started
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card-lg border border-gray-100 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" htmlFor="firstName" icon={User} error={errors.firstName?.message}>
                  <input
                    id="firstName" type="text" autoComplete="given-name"
                    placeholder="Rahul"
                    {...register('firstName')}
                    className={clsx('input pl-10', errors.firstName && 'input-error')}
                  />
                </Field>
                <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
                  <input
                    id="lastName" type="text" autoComplete="family-name"
                    placeholder="Sharma"
                    {...register('lastName')}
                    className={clsx('input', errors.lastName && 'input-error')}
                  />
                </Field>
              </div>

              {/* Email */}
              <Field label="Email address" htmlFor="email" icon={Mail} error={errors.email?.message}>
                <input
                  id="email" type="email" autoComplete="email"
                  placeholder="you@company.com"
                  {...register('email')}
                  className={clsx('input pl-10', errors.email && 'input-error')}
                />
              </Field>

              {/* Phone + Company row */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" htmlFor="phone" icon={Phone} error={errors.phone?.message}>
                  <input
                    id="phone" type="tel" autoComplete="tel"
                    placeholder="9876543210"
                    {...register('phone')}
                    className={clsx('input pl-10', errors.phone && 'input-error')}
                  />
                </Field>
                <Field label="Company" htmlFor="company" icon={Building2} error={errors.company?.message}>
                  <input
                    id="company" type="text" autoComplete="organization"
                    placeholder="Acme Corp"
                    {...register('company')}
                    className={clsx('input pl-10', errors.company && 'input-error')}
                  />
                </Field>
              </div>

              {/* Role */}
              <Field label="Role" htmlFor="role" icon={Briefcase} error={errors.role?.message}>
                <select
                  id="role"
                  {...register('role')}
                  className={clsx('input pl-10 appearance-none cursor-pointer', errors.role && 'input-error')}
                >
                  <option value="" disabled>Select your role…</option>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </Field>

              {/* Password */}
              <Field label="Password" htmlFor="password" icon={Lock} error={errors.password?.message}>
                <input
                  id="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password" placeholder="Min. 8 characters"
                  {...register('password')}
                  className={clsx('input pl-10 pr-10', errors.password && 'input-error')}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors focus:outline-none">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </Field>

              {/* Password strength bar */}
              {pwd.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={clsx(
                        'h-1 flex-1 rounded-full transition-all duration-300',
                        i < strengthScore ? strengthColor : 'bg-gray-100'
                      )} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Strength: <span className="font-semibold text-gray-600">{strengthLabel}</span>
                  </p>
                </div>
              )}

              {/* Confirm Password */}
              <Field label="Confirm password" htmlFor="confirmPassword"
                     icon={Lock} error={errors.confirmPassword?.message}>
                <input
                  id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password" placeholder="Re-enter password"
                  {...register('confirmPassword')}
                  className={clsx('input pl-10 pr-10', errors.confirmPassword && 'input-error')}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors focus:outline-none">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </Field>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full btn-lg mt-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white
                                    rounded-full animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-1">
                By creating an account you agree to our Terms of Service.
              </p>
            </form>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login"
                  className="text-primary-600 font-semibold hover:text-primary-700
                             hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
