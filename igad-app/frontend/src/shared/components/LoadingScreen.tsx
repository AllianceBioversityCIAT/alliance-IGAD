import { Spinner } from '@/shared/components/ui/Spinner'

export const LoadingScreen: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#ffffff',
      }}
    >
      <Spinner size="lg" className="text-green-600" />
    </div>
  )
}
