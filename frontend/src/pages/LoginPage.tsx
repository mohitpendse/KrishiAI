import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import AuthPageShell from '../components/AuthPageShell'

interface LoginForm {
  identifier: string
  password: string
}

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.identifier, data.password)
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Login - KrishiAI</title>
      </Helmet>

      <AuthPageShell
        title="Welcome back"
        subtitle={
          <>
            New to KrishiAI?{' '}
            <Link to="/register" className="auth-link">
              Create an account
            </Link>
          </>
        }
        alternateAuth={{ to: '/register', label: 'Create account' }}
      >
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="identifier" className="auth-field-label">
              Email or Mobile Number
            </label>
            <div className="relative">
              <div className="auth-field-icon">
                <Mail className="h-5 w-5" />
              </div>
              <input
                {...register('identifier', {
                  required: 'Email or mobile number is required',
                })}
                id="identifier"
                type="text"
                className="auth-input auth-input-icon-left"
                placeholder="Enter email or mobile number"
              />
            </div>
            {errors.identifier && (
              <p className="mt-1.5 text-sm text-red-300">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="auth-field-label">
              Password
            </label>
            <div className="relative">
              <div className="auth-field-icon">
                <Lock className="h-5 w-5" />
              </div>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input auth-input-icon-both"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="auth-field-icon-right"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-300">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-white/10 text-primary focus:ring-emerald-400/50"
              />
              <span className="auth-checkbox-label">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-sm auth-link">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg w-full shadow-lg shadow-primary/30 hover-lift"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </AuthPageShell>
    </>
  )
}

export default LoginPage
