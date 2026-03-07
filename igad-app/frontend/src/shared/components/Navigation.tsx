import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '@/shared/services/authService'
import { useAdmin } from '@/tools/admin/hooks/useAdmin'
import styles from './Navigation.module.css'

export function Navigation() {
  const location = useLocation()
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const settingsItemsRef = useRef<(HTMLElement | null)[]>([])
  const userItemsRef = useRef<(HTMLElement | null)[]>([])

  const userEmail = authService.getUserEmail()
  const isAuthenticated = authService.isAuthenticated()
  const { isAdmin } = useAdmin()

  const handleSettingsDropdownToggle = () => {
    setShowSettingsDropdown(prev => !prev)
  }

  // Auto-focus first item on dropdown open
  useEffect(() => {
    if (showSettingsDropdown) {
      requestAnimationFrame(() => {
        settingsItemsRef.current[0]?.focus()
      })
    }
  }, [showSettingsDropdown])

  useEffect(() => {
    if (showUserDropdown) {
      requestAnimationFrame(() => {
        userItemsRef.current[0]?.focus()
      })
    }
  }, [showUserDropdown])

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

  const handleDropdownKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      itemsRef: React.MutableRefObject<(HTMLElement | null)[]>,
      setShow: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
      const items = itemsRef.current.filter(Boolean) as HTMLElement[]
      const currentIndex = items.indexOf(e.target as HTMLElement)

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0
          items[next]?.focus()
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1
          items[prev]?.focus()
          break
        }
        case 'Escape':
          e.preventDefault()
          setShow(false)
          break
      }
    },
    []
  )

  const pathname = location.pathname

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        {/* IGAD Logo */}
        <Link to="/" className={styles.logoLink}>
          <img src="/igad-navbar-logo.svg" alt="IGAD Innovation Hub" className={styles.logoImage} />
        </Link>

        {/* Navigation Buttons */}
        <div className={styles.navButtons}>
          {/* Dashboard Button */}
          <Link
            to="/dashboard"
            className={`${styles.dashboardLink} ${pathname === '/dashboard' ? styles.dashboardLinkActive : ''}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={pathname === '/dashboard' ? '#016630' : '#364153'}
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
              className={`${styles.dashboardLabel} ${pathname === '/dashboard' ? styles.dashboardLabelActive : ''}`}
            >
              Dashboard
            </span>
          </Link>

          {/* Guide/Tutorial Button */}
          <Link
            to="/guide"
            title="Watch Tutorial"
            className={`${styles.guideButton} ${pathname === '/guide' ? styles.guideButtonActive : ''}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={pathname === '/guide' ? '#016630' : '#364153'}
              strokeWidth="1.33"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon
                points="10 8 16 12 10 16 10 8"
                fill={pathname === '/guide' ? '#016630' : '#364153'}
              />
            </svg>
          </Link>

          {/* Notifications Button - Disabled */}
          <div className={styles.notificationButton}>
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
            <div className={styles.notificationBadge}>
              <span className={styles.notificationBadgeText}>2</span>
            </div>
          </div>

          {/* Settings Button */}
          <div ref={dropdownRef} className={styles.settingsWrapper}>
            <button onClick={handleSettingsDropdownToggle} className={styles.settingsButton}>
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
                className={`${styles.dropdownPanel} ${styles.settingsDropdown}`}
                role="menu"
                onKeyDown={e => handleDropdownKeyDown(e, settingsItemsRef, setShowSettingsDropdown)}
              >
                {(() => {
                  let itemIndex = 0
                  return (
                    <>
                      {/* Admin-only links */}
                      {isAdmin && (
                        <>
                          <Link
                            to="/admin/settings"
                            className={`${styles.dropdownLink} ${pathname === '/admin/settings' ? styles.dropdownLinkActive : ''}`}
                            onClick={() => setShowSettingsDropdown(false)}
                            role="menuitem"
                            ref={el => {
                              settingsItemsRef.current[0] = el
                            }}
                          >
                            Settings
                          </Link>
                          <Link
                            to="/admin/prompt-manager"
                            className={`${styles.dropdownLink} ${styles.dropdownLinkNoBorder} ${pathname === '/admin/prompt-manager' ? styles.dropdownLinkActive : ''}`}
                            onClick={() => setShowSettingsDropdown(false)}
                            role="menuitem"
                            ref={el => {
                              settingsItemsRef.current[1] = el
                            }}
                          >
                            Prompt Manager
                          </Link>
                        </>
                      )}

                      {/* API Configuration */}
                      <button
                        className={styles.dropdownButtonDisabled}
                        disabled
                        role="menuitem"
                        ref={el => {
                          settingsItemsRef.current[isAdmin ? 2 : itemIndex++] = el
                        }}
                      >
                        API Configuration
                      </button>

                      {/* Language */}
                      <button
                        className={`${styles.dropdownButtonDisabled} ${styles.dropdownButtonDisabledBorder}`}
                        disabled
                        role="menuitem"
                        ref={el => {
                          settingsItemsRef.current[isAdmin ? 3 : itemIndex++] = el
                        }}
                      >
                        Language
                      </button>

                      {/* Help & Support */}
                      <button
                        className={styles.dropdownButtonDisabled}
                        disabled
                        role="menuitem"
                        ref={el => {
                          settingsItemsRef.current[isAdmin ? 4 : itemIndex++] = el
                        }}
                      >
                        Help & Support
                      </button>
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          {/* User Account Button */}
          <div ref={userDropdownRef} className={styles.userWrapper}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className={styles.userButton}
            >
              <div className={styles.userAvatar}>
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
              <div className={styles.userEmail}>
                <span
                  className={styles.userEmailText}
                  title={isAuthenticated && userEmail ? userEmail : 'Login'}
                >
                  {isAuthenticated && userEmail ? userEmail : 'Login'}
                </span>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserDropdown && (
              <div
                className={`${styles.dropdownPanel} ${styles.userDropdown}`}
                role="menu"
                onKeyDown={e => handleDropdownKeyDown(e, userItemsRef, setShowUserDropdown)}
              >
                {isAuthenticated ? (
                  <>
                    <div className={styles.userInfoSection}>
                      <div className={styles.userInfoEmail} title={userEmail || ''}>
                        {userEmail}
                      </div>
                      <div className={styles.userInfoStatus}>Authenticated</div>
                    </div>
                    <button
                      onClick={() => authService.logout()}
                      className={styles.logoutButton}
                      role="menuitem"
                      ref={el => {
                        userItemsRef.current[0] = el
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className={styles.loginLink}
                    role="menuitem"
                    ref={el => {
                      userItemsRef.current[0] = el
                    }}
                  >
                    Login
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
