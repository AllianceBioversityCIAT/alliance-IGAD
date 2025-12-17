import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '@/shared/services/authService'
import { Spinner } from '@/shared/components/ui/Spinner'
import styles from './LoginPage.module.css'

interface ChangePasswordForm {
  newPassword: string
  confirmPassword: string
}

interface LocationState {
  username: string
  session: string
}

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const state = location.state as LocationState

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ChangePasswordForm>()

  const newPassword = watch('newPassword')

  // Redirect if no session data - AFTER all hooks
  if (!state?.username || !state?.session) {
    navigate('/login')
    return null
  }

  const onSubmit = async (data: ChangePasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await authService.completePasswordChange(
        state.username,
        state.session,
        data.newPassword
      )

      // Password changed successfully - store token and redirect
      authService.setToken(response.access_token, false)
      authService.setUserEmail(state.username, false)

      navigate('/', {
        state: {
          message: 'Password changed successfully. Welcome to IGAD Innovation Hub!',
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error changing password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
        <div className={styles.formContainer}>
          {/* IGAD Logo */}
          <div>
            <img src="/logologin.png" alt="IGAD Innovation Hub" className={styles.logo} />
          </div>

          <div className={styles.formContent}>
            <div className={styles.formHeader}>
              <h1 className={styles.title}>Change Password</h1>
              <p className={styles.subtitle}>
                You must change your temporary password to a new one
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.fieldGroup}>
                <label htmlFor="newPassword" className={styles.label}>
                  New Password
                </label>
                <div className={styles.passwordField}>
                  <input
                    {...register('newPassword', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message:
                          'Password must contain at least one uppercase, one lowercase and one number',
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    className={`${styles.input} ${styles.passwordInput} ${errors.newPassword ? styles.inputError : ''}`}
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.newPassword && (
                  <span className={styles.errorText}>{errors.newPassword.message}</span>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirm Password
                </label>
                <div className={styles.passwordField}>
                  <input
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: value => value === newPassword || 'Passwords do not match',
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className={`${styles.input} ${styles.passwordInput} ${errors.confirmPassword ? styles.inputError : ''}`}
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className={styles.errorText}>{errors.confirmPassword.message}</span>
                )}
              </div>

              <button type="submit" disabled={isLoading} className={styles.submitButton}>
                {isLoading ? <Spinner size="sm" /> : 'Change Password'}
                {!isLoading && <span>→</span>}
              </button>
            </form>

            <p className={styles.supportText}>
              Having trouble changing your password?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={styles.supportLink}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Volver al login
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className={styles.rightColumn}>
        <div className={styles.backgroundImage}>
          <div className={styles.overlay}></div>
        </div>
      </div>
    </div>
  )
}
