import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '@/shared/services/authService'
import { Spinner } from '@/shared/components/ui/Spinner'
import styles from './LoginPage.module.css'

interface ForgotPasswordForm {
  email: string
}

interface ResetPasswordForm {
  code: string
  newPassword: string
  confirmPassword: string
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<ForgotPasswordForm>()
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordForm>({
    defaultValues: {
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onEmailSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Normalize email to lowercase
      const normalizedEmail = data.email.toLowerCase().trim()
      await authService.forgotPassword(normalizedEmail)
      setEmail(normalizedEmail)
      setSuccess('Reset code sent to your email')
      setStep('reset')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send reset code')
    } finally {
      setIsLoading(false)
    }
  }

  const onResetSubmit = async (data: ResetPasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await authService.resetPassword(email, data.code, data.newPassword)
      // Redirect to login with success message
      navigate('/login', {
        state: {
          message: 'Password reset successfully. Log in with your new password.',
          email: email,
        },
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset password')
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
            <img src="/logologin.png" alt="IGAD Innovation Hub" className={styles.logo} />
          </div>

          {/* Form Content */}
          <div className={styles.formContent}>
            {/* Form Header */}
            <div className={styles.formHeader}>
              <h1 className={styles.title}>
                {step === 'email' ? 'Forgot Password' : 'Reset Password'}
              </h1>
              <p className={styles.subtitle}>
                {step === 'email'
                  ? "Enter your email address and we'll send you a reset code"
                  : 'Enter the code sent to your email and your new password'}
              </p>
            </div>

            {/* Success/Error Messages */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {success && (
              <div
                style={{
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  color: '#155724',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '14px',
                }}
              >
                {success}
              </div>
            )}

            {step === 'email' ? (
              /* Email Form */
              <form onSubmit={handleEmailSubmit(onEmailSubmit)} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email address</label>
                  <input
                    type="email"
                    placeholder="you@organization.org"
                    autoComplete="email"
                    {...registerEmail('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                      setValueAs: (value) => value.toLowerCase().trim(),
                    })}
                    className={styles.input}
                    style={{ textTransform: 'lowercase' }}
                  />
                  {emailErrors.email && (
                    <span className={styles.errorText}>{emailErrors.email.message}</span>
                  )}
                </div>

                <button type="submit" disabled={isLoading} className={styles.submitButton}>
                  {isLoading ? <Spinner size="sm" /> : 'Send Reset Code'}
                  {!isLoading && <span>→</span>}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Link
                    to="/login"
                    style={{
                      color: '#6B7280',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontFamily: 'Arial',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    &larr; Back to Login
                  </Link>
                </div>
              </form>
            ) : (
              /* Reset Password Form */
              <form onSubmit={handleResetSubmit(onResetSubmit)} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Reset Code</label>
                  <input
                    type="text"
                    placeholder="Enter the code from your email"
                    {...registerReset('code', {
                      required: 'Reset code is required',
                    })}
                    className={styles.input}
                  />
                  {resetErrors.code && (
                    <span className={styles.errorText}>{resetErrors.code.message}</span>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>New Password</label>
                  <div className={styles.passwordField}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter your new password"
                      {...registerReset('newPassword', {
                        required: 'New password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters',
                        },
                      })}
                      className={`${styles.input} ${styles.passwordInput}`}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {resetErrors.newPassword && (
                    <span className={styles.errorText}>{resetErrors.newPassword.message}</span>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Confirm Password</label>
                  <div className={styles.passwordField}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      {...registerReset('confirmPassword', {
                        required: 'Please confirm your password',
                      })}
                      className={`${styles.input} ${styles.passwordInput}`}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {resetErrors.confirmPassword && (
                    <span className={styles.errorText}>{resetErrors.confirmPassword.message}</span>
                  )}
                </div>

                <button type="submit" disabled={isLoading} className={styles.submitButton}>
                  {isLoading ? <Spinner size="sm" /> : 'Reset Password'}
                  {!isLoading && <span>→</span>}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Link
                    to="/login"
                    style={{
                      color: '#6B7280',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontFamily: 'Arial',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    &larr; Back to Login
                  </Link>
                </div>
              </form>
            )}
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
