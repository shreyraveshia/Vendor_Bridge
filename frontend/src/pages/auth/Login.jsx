import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { clsx } from 'clsx';

// ── Validation schema ──────────────────────────────────────────────────────
const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ── Feature bullets ────────────────────────────────────────────────────────
const FEATURES = [
  { icon: TrendingUp,   text: 'End-to-end RFQ to PO workflow' },
  { icon: CheckCircle2, text: 'Multi-step approval chains with instant alerts' },
  { icon: ShieldCheck,  text: 'GST-compliant invoicing & PDF generation' },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate   = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email, password }) => {
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — branding ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative overflow-hidden
                      flex-col items-center justify-center p-12"
           style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 30%, #16a34a 70%, #4ade80 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10
                        bg-white" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10
                        bg-white" />
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2
                        w-64 h-64 rounded-full opacity-5 bg-white" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{
               backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
               backgroundSize: '28px 28px'
             }}
        />

        <div className="relative z-10 max-w-md text-center">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-white/10 backdrop-blur-sm mb-6 shadow-xl border border-white/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>

          <div className="text-white/60 text-sm font-semibold tracking-widest uppercase mb-2">
            Welcome to
          </div>
          <h1 className="text-5xl font-black text-white mb-3 leading-tight">
            Vendor<span className="text-green-300">Bridge</span>
          </h1>
          <p className="text-xl text-white/80 font-light mb-2">
            Streamline Your Procurement
          </p>
          <p className="text-white/60 text-sm mb-10">
            The complete procurement & vendor management platform for modern enterprises.
          </p>

          {/* Feature list */}
          <div className="space-y-4 text-left">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/90">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center
                                justify-center border border-white/20">
                  <Icon size={15} className="text-green-300" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { val: '99.9%', label: 'Uptime' },
              { val: '₹ Cr+', label: 'Spend Managed' },
              { val: 'SOC2',  label: 'Compliant' },
            ].map(s => (
              <div key={s.label}
                   className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
                <div className="text-white font-bold text-lg">{s.val}</div>
                <div className="text-white/60 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gray-50">
        <div className="w-full max-w-[400px] animate-slide-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">VendorBridge</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-card-lg border border-gray-100 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

              {/* Email */}
              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@vendorbridge.com"
                    {...register('email')}
                    className={clsx('input pl-10', errors.email && 'input-error')}
                  />
                </div>
                {errors.email && (
                  <p className="error-msg">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={clsx('input pl-10 pr-10', errors.password && 'input-error')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400
                               hover:text-gray-600 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="error-msg">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full btn-lg mt-2 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white
                                    rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400 font-medium">demo credentials</span>
              </div>
            </div>

            {/* Demo credential quick-fill pills */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Admin',       email: 'admin@vendorbridge.com',       pass: 'Admin@123' },
                { label: 'Procurement', email: 'procurement@vendorbridge.com', pass: 'Proc@1234' },
                { label: 'Manager',     email: 'manager@vendorbridge.com',     pass: 'Mgr@12345' },
                { label: 'Vendor',      email: 'vendor1@techcorp.com',         pass: 'Vend@1234' },
              ].map(cred => (
                <button
                  key={cred.label}
                  type="button"
                  onClick={() => {
                    document.getElementById('email').value = cred.email;
                    document.getElementById('password').value = cred.pass;
                    // Trigger react-hook-form's internal state
                    const emailInput = document.getElementById('email');
                    const passInput  = document.getElementById('password');
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                      window.HTMLInputElement.prototype, 'value'
                    ).set;
                    nativeInputValueSetter.call(emailInput, cred.email);
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nativeInputValueSetter.call(passInput, cred.pass);
                    passInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }}
                  className="text-xs bg-gray-50 hover:bg-primary-50 hover:text-primary-700
                             hover:border-primary-200 border border-gray-200 rounded-lg
                             px-3 py-2 text-gray-600 font-medium transition-all duration-150
                             text-left"
                >
                  <div className="font-semibold">{cred.label}</div>
                  <div className="text-[10px] text-gray-400 truncate">{cred.email}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register"
                  className="text-primary-600 font-semibold hover:text-primary-700
                             hover:underline transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
