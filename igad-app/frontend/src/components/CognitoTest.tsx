import React, { useState } from 'react'
import { authService } from '../services/authService'

const CognitoTest: React.FC = () => {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [token, setToken] = useState<string>('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await authService.login(form)
      setResult({ success: true, data: response })
      setToken(response.access_token)
      authService.setToken(response.access_token, false) // Default to session storage
      authService.setUserEmail(form.username, false)
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>🧪 Cognito Authentication Test</h2>

      <form onSubmit={handleLogin} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Username or Email"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Logging in...' : 'Login with Cognito'}
        </button>
      </form>

      {result && (
        <div
          style={{
            padding: '15px',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            marginTop: '20px',
          }}
        >
          <h4>{result.success ? '✅ Success' : '❌ Error'}</h4>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {token && (
        <div style={{ marginTop: '20px' }}>
          <h4>🔑 Access Token:</h4>
          <textarea
            value={token}
            readOnly
            style={{
              width: '100%',
              height: '100px',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default CognitoTest
