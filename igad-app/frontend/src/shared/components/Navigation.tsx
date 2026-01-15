import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { authService } from '@/shared/services/authService'
import { useAdmin } from '@/tools/admin/hooks/useAdmin'

export function Navigation() {
  const location = useLocation()
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [isLoadingDropdown, setIsLoadingDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)

  const userEmail = authService.getUserEmail()
  const isAuthenticated = authService.isAuthenticated()
  const { isAdmin } = useAdmin()

  // Skeleton component for dropdown loading
  const DropdownSkeleton = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
      }}
    >
      {[1, 2, 3].map(item => (
        <div
          key={item}
          style={{
            height: '40px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px',
            margin: '4px 0',
          }}
        />
      ))}
    </div>
  )

  // Handle dropdown toggle with loading
  const handleSettingsDropdownToggle = () => {
    if (!showSettingsDropdown) {
      setIsLoadingDropdown(true)
      setShowSettingsDropdown(true)
      // Simulate loading time
      setTimeout(() => {
        setIsLoadingDropdown(false)
      }, 300)
    } else {
      setShowSettingsDropdown(false)
      setIsLoadingDropdown(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '0px 40px 1px',
        width: '100%',
        height: '65px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          height: '64px',
          maxWidth: '1582px',
          margin: '0 auto',
        }}
      >
        {/* IGAD Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <img
            src="/igad-navbar-logo.svg"
            alt="IGAD Innovation Hub"
            style={{
              height: '56px',
              width: 'auto',
            }}
          />
        </Link>

        {/* Navigation Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Dashboard Button */}
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '14px',
              padding: '6px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              background: location.pathname === '/dashboard' ? '#DCFCE7' : 'transparent',
              transition: 'background 0.2s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={location.pathname === '/dashboard' ? '#016630' : '#364153'}
              strokeWidth="1.33"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span
              style={{
                fontFamily: 'Arial',
                fontSize: '14px',
                lineHeight: '20px',
                color: location.pathname === '/dashboard' ? '#016630' : '#364153',
                fontWeight: location.pathname === '/dashboard' ? '600' : 'normal',
              }}
            >
              Dashboard
            </span>
          </Link>

          {/* Notifications Button - Disabled */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '36px',
              height: '36px',
              background: 'transparent',
              borderRadius: '8px',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#364153"
              strokeWidth="1.33"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {/* Notification Badge */}
            <div
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '20px',
                height: '20px',
                background: '#FB2C36',
                borderRadius: '8px',
              }}
            >
              <span
                style={{
                  fontFamily: 'Arial',
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#FFFFFF',
                }}
              >
                2
              </span>
            </div>
          </div>

          {/* Settings Button */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={handleSettingsDropdownToggle}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '36px',
                height: '36px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#364153"
                strokeWidth="1.33"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>

            {/* Settings Dropdown */}
            {showSettingsDropdown && (
              <div
                style={{
                  position: 'absolute',
                  width: '160px',
                  right: '0px',
                  top: '44px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow:
                    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  zIndex: 210,
                  padding: '4px 0',
                }}
              >
                {isLoadingDropdown ? (
                  <DropdownSkeleton />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Admin-only links */}
                    {isAdmin && (
                      <>
                        {/* Settings */}
                        <Link
                          to="/admin/settings"
                          style={{
                            padding: '12px 16px',
                            background:
                              location.pathname === '/admin/settings' ? '#DCFCE7' : 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontFamily: 'Arial',
                            color: location.pathname === '/admin/settings' ? '#016630' : '#374151',
                            width: '100%',
                            borderBottom: '1px solid #F3F4F6',
                            textDecoration: 'none',
                            display: 'block',
                            fontWeight: location.pathname === '/admin/settings' ? '600' : 'normal',
                          }}
                          onClick={() => setShowSettingsDropdown(false)}
                        >
                          Settings
                        </Link>

                        {/* Prompt Manager */}
                        <Link
                          to="/admin/prompt-manager"
                          style={{
                            padding: '12px 16px',
                            background:
                              location.pathname === '/admin/prompt-manager'
                                ? '#DCFCE7'
                                : 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontFamily: 'Arial',
                            color:
                              location.pathname === '/admin/prompt-manager' ? '#016630' : '#374151',
                            width: '100%',
                            textDecoration: 'none',
                            display: 'block',
                            fontWeight:
                              location.pathname === '/admin/prompt-manager' ? '600' : 'normal',
                          }}
                          onClick={() => setShowSettingsDropdown(false)}
                        >
                          Prompt Manager
                        </Link>
                      </>
                    )}

                    {/* API Configuration */}
                    <button
                      style={{
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'not-allowed',
                        fontSize: '14px',
                        fontFamily: 'Arial',
                        color: '#374151',
                        width: '100%',
                        opacity: 0.5,
                      }}
                      disabled
                    >
                      API Configuration
                    </button>

                    {/* Language */}
                    <button
                      style={{
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'not-allowed',
                        fontSize: '14px',
                        fontFamily: 'Arial',
                        color: '#374151',
                        width: '100%',
                        borderBottom: '1px solid #F3F4F6',
                        opacity: 0.5,
                      }}
                      disabled
                    >
                      Language
                    </button>

                    {/* Help & Support */}
                    <button
                      style={{
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'not-allowed',
                        fontSize: '14px',
                        fontFamily: 'Arial',
                        color: '#374151',
                        width: '100%',
                        opacity: 0.5,
                      }}
                      disabled
                    >
                      Help & Support
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Account Button */}
          <div ref={userDropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '32px',
                  height: '32px',
                  background: '#000000',
                  borderRadius: '50%',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.33"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: '200px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Arial',
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#364153',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={isAuthenticated && userEmail ? userEmail : 'Login'}
                >
                  {isAuthenticated && userEmail ? userEmail : 'Login'}
                </span>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserDropdown && (
              <div
                style={{
                  position: 'absolute',
                  width: '200px',
                  right: '0px',
                  top: '44px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow:
                    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  zIndex: 210,
                  padding: '4px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {isAuthenticated ? (
                    <>
                      {/* User Info */}
                      <div
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #F3F4F6',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '14px',
                            fontFamily: 'Arial',
                            color: '#374151',
                            fontWeight: 'bold',
                            maxWidth: '168px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={userEmail || ''}
                        >
                          {userEmail}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontFamily: 'Arial',
                            color: '#6B7280',
                          }}
                        >
                          Authenticated
                        </div>
                      </div>

                      {/* Logout */}
                      <button
                        onClick={() => authService.logout()}
                        style={{
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontFamily: 'Arial',
                          color: '#DC2626',
                          width: '100%',
                        }}
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      style={{
                        padding: '12px 16px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontFamily: 'Arial',
                        color: '#374151',
                        width: '100%',
                        display: 'block',
                      }}
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
