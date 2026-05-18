import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Phone, Lock, Mail, User, MapPin } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import AuthPageShell from '../components/AuthPageShell'

interface RegisterForm {
  mobile: string
  email?: string
  password: string
  confirmPassword: string
  first_name: string
  last_name?: string
  preferred_language: string
  farm_location_text: string
  farm_lat?: number
  farm_lng?: number
}

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const { register: registerUser } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterForm>({
    defaultValues: {
      preferred_language: 'en',
      farm_location_text: '',
    },
  })

  const password = watch('password')

  const formatLocation = (address: Record<string, string>, fallback: string) => {
    return [
      address.locality,
      address.city,
      address.principalSubdivision,
      address.countryName,
    ].filter(Boolean).slice(0, 3).join(', ') || fallback
  }

  const useCurrentLocation = () => {
    setLocationError('')

    if (!window.isSecureContext) {
      setLocationError('Location access needs HTTPS or localhost. Type your village or city instead.')
      return
    }

    if (!navigator.geolocation) {
      setLocationError('Location access is not supported in this browser.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6))
        const lng = Number(position.coords.longitude.toFixed(6))
        const fallback = `${lat}, ${lng}`

        setValue('farm_lat', lat)
        setValue('farm_lng', lng)
        setValue('farm_location_text', fallback, { shouldValidate: true, shouldDirty: true })

        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          )
          if (response.ok) {
            const data = await response.json()
            setValue('farm_location_text', formatLocation(data, fallback), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        } catch {
          setLocationError('Location found, but the address lookup failed. Coordinates were saved.')
        }

        setIsLocating(false)
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access or type your village/city.'
            : 'Could not read your current location. You can type your village or city instead.'
        setLocationError(message)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      return
    }

    setIsLoading(true)
    try {
      await registerUser({
        mobile: data.mobile,
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        preferred_language: data.preferred_language,
        farm_location: {
          address: data.farm_location_text,
          lat: data.farm_lat,
          lng: data.farm_lng,
        },
      })
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Register - KrishiAI</title>
      </Helmet>

      <AuthPageShell
        title="Create your account"
        maxWidth="max-w-lg"
        subtitle={
          <>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </>
        }
        alternateAuth={{ to: '/login', label: 'Sign in' }}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="auth-field-label">
                First Name <span className="text-red-300">*</span>
              </label>
              <div className="relative">
                <div className="auth-field-icon">
                  <User className="h-5 w-5" />
                </div>
                <input
                  {...register('first_name', {
                    required: 'First name is required',
                    minLength: {
                      value: 2,
                      message: 'First name must be at least 2 characters',
                    },
                  })}
                  id="first_name"
                  type="text"
                  className="auth-input auth-input-icon-left"
                  placeholder="First name"
                />
              </div>
              {errors.first_name && (
                <p className="mt-1.5 text-sm text-red-300">{errors.first_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="last_name" className="auth-field-label">
                Last Name
              </label>
              <div className="relative">
                <div className="auth-field-icon">
                  <User className="h-5 w-5" />
                </div>
                <input
                  {...register('last_name')}
                  id="last_name"
                  type="text"
                  className="auth-input auth-input-icon-left"
                  placeholder="Last name (optional)"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="mobile" className="auth-field-label">
              Mobile Number <span className="text-red-300">*</span>
            </label>
            <div className="relative">
              <div className="auth-field-icon">
                <Phone className="h-5 w-5" />
              </div>
              <input
                {...register('mobile', {
                  required: 'Mobile number is required',
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: 'Please enter a valid 10-digit mobile number',
                  },
                })}
                id="mobile"
                type="tel"
                className="auth-input auth-input-icon-left"
                placeholder="10-digit mobile number"
              />
            </div>
            {errors.mobile && (
              <p className="mt-1.5 text-sm text-red-300">{errors.mobile.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="auth-field-label">
              Email Address
            </label>
            <div className="relative">
              <div className="auth-field-icon">
                <Mail className="h-5 w-5" />
              </div>
              <input
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Please enter a valid email address',
                  },
                })}
                id="email"
                type="email"
                className="auth-input auth-input-icon-left"
                placeholder="Email (optional)"
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-300">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="farm_location_text" className="auth-field-label">
              Farm Location <span className="text-red-300">*</span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <div className="auth-field-icon">
                  <MapPin className="h-5 w-5" />
                </div>
                <input
                  {...register('farm_location_text', {
                    required: 'Farm location is required for local weather',
                    minLength: {
                      value: 2,
                      message: 'Enter a village, city, or use current location',
                    },
                  })}
                  id="farm_location_text"
                  type="text"
                  className="auth-input auth-input-icon-left"
                  placeholder="Village, city, or district"
                />
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={isLocating}
                className="auth-location-button"
              >
                <MapPin className="h-4 w-4" />
                {isLocating ? 'Locating...' : 'Use Location'}
              </button>
            </div>
            <input type="hidden" {...register('farm_lat', { valueAsNumber: true })} />
            <input type="hidden" {...register('farm_lng', { valueAsNumber: true })} />
            {errors.farm_location_text && (
              <p className="mt-1.5 text-sm text-red-300">{errors.farm_location_text.message}</p>
            )}
            {locationError && (
              <p className="mt-1.5 text-sm text-amber-200">{locationError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="auth-field-label">
                Password <span className="text-red-300">*</span>
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
                  placeholder="Create password"
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

            <div>
              <label htmlFor="confirmPassword" className="auth-field-label">
                Confirm Password <span className="text-red-300">*</span>
              </label>
              <div className="relative">
                <div className="auth-field-icon">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value: string) =>
                      value === password || 'Passwords do not match',
                  })}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input auth-input-icon-both"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  className="auth-field-icon-right"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-sm text-red-300">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="preferred_language" className="auth-field-label">
              Preferred Language
            </label>
            <select
              {...register('preferred_language')}
              id="preferred_language"
              className="auth-input"
            >
              <option value="en" className="text-slate-900">
                English
              </option>
              <option value="hi" className="text-slate-900">
                हिन्दी (Hindi)
              </option>
              <option value="ta" className="text-slate-900">
                தமிழ் (Tamil)
              </option>
              <option value="te" className="text-slate-900">
                తెలుగు (Telugu)
              </option>
            </select>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 mt-0.5 rounded border-white/30 bg-white/10 text-primary focus:ring-emerald-400/50 shrink-0"
            />
            <span className="auth-checkbox-label">
              I agree to the{' '}
              <Link to="/terms" className="auth-link">
                Terms and Conditions
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="auth-link">
                Privacy Policy
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg w-full shadow-lg shadow-primary/30 hover-lift"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>
      </AuthPageShell>
    </>
  )
}

export default RegisterPage
