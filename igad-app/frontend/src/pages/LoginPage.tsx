import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
    <div className="login-page">
      {/* Left Column - Form */}
      <div className="login-form-column">
        <div className="login-form-container">
          {/* IGAD Logo */}
          <div className="login-logo">
            <img src="/igad-logo.png" alt="IGAD Innovation Hub" className="logo-image" />
          </div>

          {/* Form Header */}
          <div className="login-header">
            <h1 className="login-title">Log In</h1>
            <p className="login-subtitle">Enter your email and password to access your account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@organization.org"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                error={errors.email?.message}
                className="login-input"
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-field">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                  error={errors.password?.message}
                  className="login-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="checkbox"
                />
                <span className="checkbox-label">Remember me</span>
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Signing In...
                </>
              ) : (
                <>
                  Log In
                  <span className="login-arrow">→</span>
                </>
              )}
            </button>

            {/* Support Text */}
            <p className="support-text">
              Need help? Contact our support team at <a href="mailto:support@igad.org" className="support-link">[email]</a>
            </p>
          </form>
        </div>
      </div>

      {/* Right Column - Background Image */}
      <div className="login-image-column">
        <div className="login-background-image"></div>
      </div>
    </div>
  )
}
