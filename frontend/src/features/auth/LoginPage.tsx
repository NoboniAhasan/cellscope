import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '../../types';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      const res = await login(data.email, data.password);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (res.user.role === 'reviewer') {
        navigate('/reviews', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setServerError(apiErr.message || 'Login failed. Please check your credentials.');
    }
  };

  const fillCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setServerError(null);
  };

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to CellScope</h1>
        <p className="text-sm text-slate-500 mt-1">
          Microscopy analysis & research collaboration
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2"
        >
          <span className="text-red-500 font-bold" aria-hidden="true">✕</span>
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            placeholder="scientist@institution.org"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Demo Credentials Helper */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-500 mb-2 text-center uppercase tracking-wider">
          Quick Demo Credentials
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillCredentials('researcher@cellscope.org', 'password123')}
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg border border-slate-200 transition text-center"
          >
            Researcher Demo
          </button>
          <button
            type="button"
            onClick={() => fillCredentials('reviewer@cellscope.org', 'password123')}
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg border border-slate-200 transition text-center"
          >
            Reviewer Demo
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-600 mt-6">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-teal-700 hover:underline font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  );
}
