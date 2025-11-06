import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'

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
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      background: '#FFFFFF'
    }}>
      {/* Left Column - Form */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '50%',
        padding: '40px',
        backgroundImage: 'url(/textura.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '118.71px',
          width: '460px',
          maxWidth: '100%'
        }}>
          {/* IGAD Logo */}
          <div>
            <img 
              src="/logologin.png" 
              alt="IGAD Innovation Hub" 
              style={{
                width: '459px',
                height: '87px',
                maxWidth: '100%'
              }}
            />
          </div>

          {/* Form Content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '31.8px',
            width: '100%'
          }}>
            {/* Form Header */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '11.87px',
              width: '100%'
            }}>
              <h1 style={{
                fontFamily: 'Arial',
                fontWeight: 700,
                fontSize: '35.6px',
                lineHeight: '44px',
                textAlign: 'center',
                letterSpacing: '-0.02em',
                color: '#016630',
                margin: 0,
                width: '100%'
              }}>
                Log In
              </h1>
              <p style={{
                fontFamily: 'Arial',
                fontWeight: 400,
                fontSize: '16.62px',
                lineHeight: '31px',
                textAlign: 'center',
                color: '#4A5565',
                margin: 0,
                width: '100%'
              }}>
                Enter your email and password to access your account
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16.62px',
              width: '100%'
            }}>
              {/* Email Field */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16.62px',
                width: '100%'
              }}>
                <label style={{
                  fontFamily: 'Arial',
                  fontWeight: 400,
                  fontSize: '20.775px',
                  lineHeight: '120%',
                  color: '#101828'
                }}>
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
                  style={{
                    padding: '12.465px',
                    background: '#FFFFFF',
                    border: '1.18714px solid #D1D5DB',
                    borderRadius: '7.12286px',
                    fontFamily: 'Inter',
                    fontSize: '14px',
                    color: '#969696',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.email && <span style={{ color: '#FB2C36', fontSize: '12px' }}>{errors.email.message}</span>}
              </div>

              {/* Password Field */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16.62px',
                width: '100%'
              }}>
                <label style={{
                  fontFamily: 'Arial',
                  fontWeight: 400,
                  fontSize: '20.775px',
                  lineHeight: '120%',
                  color: '#101828'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
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
                    style={{
                      padding: '12.465px',
                      background: '#FFFFFF',
                      border: '1.18714px solid #D1D5DB',
                      borderRadius: '7.12286px',
                      fontFamily: 'Inter',
                      fontSize: '14px',
                      color: '#969696',
                      width: '100%',
                      boxSizing: 'border-box',
                      paddingRight: '40px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6B7280'
                    }}
                  >
                    {showPassword ? '👁️' : '👁️🗨️'}
                  </button>
                </div>
                {errors.password && <span style={{ color: '#FB2C36', fontSize: '12px' }}>{errors.password.message}</span>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginTop: '21.37px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11.92px',
                  fontFamily: 'Arial',
                  fontSize: '13.9106px',
                  color: '#0A0A0A'
                }}>
                  <input
                    type="checkbox"
                    {...register('rememberMe')}
                    style={{
                      width: '19.87px',
                      height: '19.87px',
                      background: '#F3F3F5',
                      border: '1.18714px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '3.56143px'
                    }}
                  />
                  Remember me
                </label>
                <a href="#" style={{
                  fontFamily: 'Arial',
                  fontSize: '13.9106px',
                  color: '#00A63E',
                  textDecoration: 'none'
                }}>
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '42.74px',
                  background: '#00A63E',
                  borderRadius: '9.49714px',
                  border: 'none',
                  color: '#FFFFFF',
                  fontFamily: 'Arial',
                  fontSize: '16.62px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '11.87px',
                  marginTop: '31.8px'
                }}
              >
                {isLoading ? 'Signing In...' : 'Log In'}
                {!isLoading && <span>→</span>}
              </button>

              {/* Support Text */}
              <p style={{
                fontFamily: 'Arial',
                fontSize: '13.9106px',
                color: '#4A5565',
                textAlign: 'center',
                margin: '31.8px 0 0 0'
              }}>
                Need help? Contact our support team at <a href="mailto:support@igad.org" style={{ color: '#00A63E' }}>[email]</a>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Right Column - Background Image */}
      <div style={{
        width: '50%',
        height: '100vh',
        position: 'relative'
      }}>
        <div 
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/fondologin.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/transparencia.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
      </div>
    </div>
  )
}
