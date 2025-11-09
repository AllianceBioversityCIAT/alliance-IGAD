import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '../services/authService'
import styles from './LoginPage.module.css'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Check for success message from password change
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clear the state to prevent showing message on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])
  
  // Get remembered email if exists, or from password change redirect
  const rememberedEmail = location.state?.email || authService.getUserEmail() || ''
  const wasRemembered = localStorage.getItem('remember_me') === 'true'
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: {
      email: rememberedEmail,
      rememberMe: wasRemembered,
      password: ''
    }
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await authService.login({
        username: data.email,
        password: data.password
      })
      
      // Check if password change is required
      if (response.requires_password_change) {
        navigate('/change-password', {
          state: {
            username: response.username || data.email,
            session: response.session
          }
        })
        return
      }
      
      // Store the token and user email
      authService.setToken(response.access_token, data.rememberMe)
      authService.setUserEmail(data.email, data.rememberMe)
      
      // Navigate to dashboard
      navigate('/')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Left Column - Form */}
      <div className={styles.leftColumn}>
        <div className={styles.formContainer}>
          {/* IGAD Logo */}
          <div>
            <img 
              src="/logologin.png" 
              alt="IGAD Innovation Hub" 
              className={styles.logo}
            />
          </div>

          {/* Form Content */}
          <div className={styles.formContent}>
            {/* Form Header */}
            <div className={styles.formHeader}>
              <h1 className={styles.title}>
                Log In
              </h1>
              <p className={styles.subtitle}>
                Enter your email and password to access your account
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              {/* Success Message */}
              {successMessage && (
                <div style={{
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  color: '#155724',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {successMessage}
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}
              
              {/* Email Field */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="you@organization.org"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className={styles.input}
                />
                {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
              </div>

              {/* Password Field */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Password
                </label>
                <div className={styles.passwordField}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters'
                      }
                    })}
                    className={`${styles.input} ${styles.passwordInput}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                  >
                    {showPassword ? '👁️' : '👁️🗨️'}
                  </button>
                </div>
                {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className={styles.formOptions}>
                <label className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    {...register('rememberMe')}
                    className={styles.checkbox}
                  />
                  Remember me
                </label>
                <a href="/forgot-password" className={styles.forgotPassword}>
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? 'Signing In...' : 'Log In'}
                {!isLoading && <span>→</span>}
              </button>

              {/* Support Text */}
              <p className={styles.supportText}>
                Need help? Contact our support team at <a href="mailto:support@igad.org" className={styles.supportLink}>[email]</a>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Right Column - Background Image */}
      <div className={styles.rightColumn}>
        <div className={styles.backgroundImage}></div>
        <div className={styles.overlay}></div>
      </div>
    </div>
  )
}
