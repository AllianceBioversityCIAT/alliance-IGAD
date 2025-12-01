import { Rocket, Lock } from 'lucide-react'

export function NewsletterGeneratorPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 65px)',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '500px',
          animation: 'fadeIn 0.5s ease-in-out',
        }}
      >
        <div
          style={{
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'center',
            animation: 'float 3s ease-in-out infinite',
          }}
        >
          <Rocket size={48} style={{ color: '#016630' }} />
        </div>

        <h2
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '12px',
          }}
        >
          Coming Soon
        </h2>

        <p
          style={{
            fontSize: '16px',
            color: '#6B7280',
            marginBottom: '8px',
            fontWeight: 500,
          }}
        >
          Newsletter Generator Tool
        </p>

        <p
          style={{
            fontSize: '14px',
            color: '#9CA3AF',
            lineHeight: '1.6',
            marginBottom: '28px',
          }}
        >
          This powerful tool will help you create and manage newsletters. Coming soon!
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '20px',
            color: '#059669',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <Lock size={16} style={{ strokeWidth: 2 }} />
          <span>Work in Progress</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  )
}
