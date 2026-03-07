import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'

function PageLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#016630',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  )
}

export function Layout() {
  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <Suspense fallback={<PageLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
