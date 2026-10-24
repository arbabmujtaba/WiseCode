import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router';
import { AlertCircle, Check, UserPlus, X } from 'lucide-react';
import { clearAuthError, registerUser } from '../store/authSlice';
import AuthLayout from '../components/layout/AuthLayout';
import FormField from '../components/ui/FormField';

// Mirrors validator.isStrongPassword() used by the backend.
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: '8+ characters' },
  { test: (p) => /[a-z]/.test(p), label: 'Lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), label: 'Uppercase letter' },
  { test: (p) => /\d/.test(p), label: 'Number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'Symbol' },
];

const signupSchema = z.object({
  firstName: z.string().trim().min(3, 'At least 3 characters').max(20, 'At most 20 characters'),
  emailId: z.string().trim().email('Enter a valid email'),
  password: z
    .string()
    .refine((p) => PASSWORD_RULES.every((r) => r.test(p)), 'Password does not meet all requirements'),
});

function Signup() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema), defaultValues: { password: '' } });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const password = watch('password') || '';
  const score = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const meterColor = score <= 2 ? 'progress-error' : score <= 4 ? 'progress-warning' : 'progress-success';

  const onSubmit = (data) => dispatch(registerUser(data));

  return (
    <AuthLayout title="Create your account" subtitle="Start practising in under a minute.">
      {error && (
        <div role="alert" className="alert alert-error alert-soft mb-5 text-sm">
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="First name"
          autoComplete="given-name"
          placeholder="Ada"
          registration={register('firstName')}
          error={errors.firstName?.message}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          registration={register('emailId')}
          error={errors.emailId?.message}
        />
        <div>
          <FormField
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            registration={register('password')}
            error={errors.password?.message}
          />
          <progress
            className={`progress mt-2 h-1.5 w-full ${meterColor}`}
            value={score}
            max={PASSWORD_RULES.length}
            aria-label="Password strength"
          />
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(password);
              return (
                <li key={r.label} className={`flex items-center gap-1 ${ok ? 'text-success' : 'text-base-content/50'}`}>
                  {ok ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                  {r.label}
                </li>
              );
            })}
          </ul>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : <UserPlus size={16} />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-base-content/70">
        Already have an account?{' '}
        <NavLink to="/login" className="link link-primary font-medium">
          Sign in
        </NavLink>
      </p>
    </AuthLayout>
  );
}

export default Signup;
