import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Bell, User } from 'lucide-react'

export function Navigation() {
  const location = useLocation()

  return (
    <nav style={{
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
      zIndex: 50
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: '64px',
        maxWidth: '1582px',
        margin: '0 auto'
      }}>
        {/* IGAD Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <img 
            src="/igad-logo.png" 
            alt="IGAD Innovation Hub" 
            style={{
              height: '56px',
              width: 'auto'
            }}
          />
        </Link>

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Dashboard Button - Disabled */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '14px',
            padding: '6px 12px',
            borderRadius: '8px',
            opacity: 0.5,
            cursor: 'not-allowed'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#364153" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span style={{
              fontFamily: 'Arial',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#364153'
            }}>
              Dashboard
            </span>
          </div>

          {/* Notifications Button - Disabled */}
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '36px',
            height: '36px',
            background: 'transparent',
            borderRadius: '8px',
            opacity: 0.5,
            cursor: 'not-allowed'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#364153" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            {/* Notification Badge */}
            <div style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '20px',
              height: '20px',
              background: '#FB2C36',
              borderRadius: '8px'
            }}>
              <span style={{
                fontFamily: 'Arial',
                fontSize: '12px',
                lineHeight: '16px',
                color: '#FFFFFF'
              }}>
                2
              </span>
            </div>
          </div>

          {/* Settings Button */}
          <button style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '36px',
            height: '36px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#364153" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          {/* User Account Button */}
          <button style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '32px',
              height: '32px',
              background: '#000000',
              borderRadius: '50%'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span style={{
              fontFamily: 'Arial',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#364153'
            }}>
              My Account
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}
