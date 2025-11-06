import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import styles from './LoginPage.module.css'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export function LoginPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      // TODO: Implement Cognito authentication in Sprint 3
      console.log('Login attempt:', data)
      // Simulate login for now
      setTimeout(() => {
        navigate('/')
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Login error:', error)
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
                <a href="#" className={styles.forgotPassword}>
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
