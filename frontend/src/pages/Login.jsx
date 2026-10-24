import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router';
import { AlertCircle, LogIn } from 'lucide-react';
import { clearAuthError, loginUser } from '../authSlice';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';

const loginSchema = z.object({
  emailId: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

function Login() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = (data) => dispatch(loginUser(data));

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue solving.">
      {error && (
        <div role="alert" className="alert alert-error alert-soft mb-5 text-sm">
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          registration={register('emailId')}
          error={errors.emailId?.message}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          registration={register('password')}
          error={errors.password?.message}
        />
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : <LogIn size={16} />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-base-content/70">
        New to WiseCode?{' '}
        <NavLink to="/signup" className="link link-primary font-medium">
          Create an account
        </NavLink>
      </p>
    </AuthLayout>
  );
}

export default Login;
