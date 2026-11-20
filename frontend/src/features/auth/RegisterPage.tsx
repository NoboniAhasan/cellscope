import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '../../types';

export const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['researcher', 'reviewer'], {
    required_error: 'Please select an account role',
  }),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'researcher',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);
      const res = await registerAuth(data.name, data.email, data.password, data.role);
      if (res.user.role === 'reviewer') {
        navigate('/reviews', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setServerError(apiErr.message || 'Registration failed.');
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your Account</h1>
        <p className="text-sm text-slate-500 mt-1">
          Join CellScope as a Researcher or Reviewer
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
          <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            placeholder="Dr. Jane Doe"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
          {errors.name && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            id="reg-email"
            type="email"
            {...register('email')}
            placeholder="jane.doe@lab.org"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Password (min. 6 characters)
          </label>
          <input
            id="reg-password"
            type="password"
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

        <div>
          <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Select Your Role
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue('role', 'researcher', { shouldValidate: true })}
              className={`p-3 text-left rounded-xl border transition ${
                selectedRole === 'researcher'
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="font-semibold text-sm">Researcher</div>
              <p className="text-xs text-slate-500 mt-0.5">Upload images, run analyses & corrections</p>
            </button>
            <button
              type="button"
              onClick={() => setValue('role', 'reviewer', { shouldValidate: true })}
              className={`p-3 text-left rounded-xl border transition ${
                selectedRole === 'reviewer'
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-600'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="font-semibold text-sm">Reviewer</div>
              <p className="text-xs text-slate-500 mt-0.5">Audit experiments & approve detections</p>
            </button>
          </div>
          {errors.role && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {errors.role.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? 'Creating account...' : 'Complete Registration'}
        </button>
      </form>

      <p className="text-center text-xs text-slate-600 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-teal-700 hover:underline font-semibold">
          Log in
        </Link>
      </p>
    </div>
  );
}
