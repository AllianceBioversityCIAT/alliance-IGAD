import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authService } from '../services/authService'
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
  
  // Redirect if no session data
  if (!state?.username || !state?.session) {
    navigate('/login')
    return null
  }
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ChangePasswordForm>()
  
  const newPassword = watch('newPassword')
  
  const onSubmit = async (data: ChangePasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:8000/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: state.username,
          session: state.session,
          new_password: data.newPassword
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || 'Error al cambiar la contraseña')
      }
      
      // Password changed successfully - redirect to login
      navigate('/login', {
        state: {
          message: 'Contraseña cambiada exitosamente. Por favor, inicia sesión con tu nueva contraseña.',
          email: state.username
        }
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña')
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
            <img 
              src="/logologin.png" 
              alt="IGAD Innovation Hub" 
              className={styles.logo}
            />
          </div>
          
          <div className={styles.formContent}>
            <div className={styles.formHeader}>
              <h1 className={styles.title}>Cambiar Contraseña</h1>
              <p className={styles.subtitle}>
                Debes cambiar tu contraseña temporal por una nueva
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label htmlFor="newPassword" className={styles.label}>
                  Nueva Contraseña
                </label>
                <div className={styles.passwordField}>
                  <input
                    {...register('newPassword', {
                      required: 'La contraseña es requerida',
                      minLength: {
                        value: 8,
                        message: 'La contraseña debe tener al menos 8 caracteres'
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
                      }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    className={`${styles.input} ${styles.passwordInput} ${errors.newPassword ? styles.inputError : ''}`}
                    placeholder="Ingresa tu nueva contraseña"
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
                  Confirmar Contraseña
                </label>
                <div className={styles.passwordField}>
                  <input
                    {...register('confirmPassword', {
                      required: 'Confirma tu contraseña',
                      validate: (value) => 
                        value === newPassword || 'Las contraseñas no coinciden'
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className={`${styles.input} ${styles.passwordInput} ${errors.confirmPassword ? styles.inputError : ''}`}
                    placeholder="Confirma tu nueva contraseña"
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

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </form>

            <p className={styles.supportText}>
              ¿Problemas para cambiar tu contraseña?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={styles.supportLink}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
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
