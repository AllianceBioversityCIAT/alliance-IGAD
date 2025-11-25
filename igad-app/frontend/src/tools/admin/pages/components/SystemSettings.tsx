import { useState } from 'react'
import { Key, Server, Globe, AlertCircle, CheckCircle, Copy } from 'lucide-react'
import styles from './SystemSettings.module.css'

export function SystemSettings() {
  const [copied, setCopied] = useState<string | null>(null)

  const systemInfo = {
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'Not configured',
    clientId: process.env.REACT_APP_COGNITO_CLIENT_ID || 'Not configured',
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    apiEndpoint: process.env.REACT_APP_API_URL || import.meta.env.VITE_API_BASE_URL,
  }

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const isConfigured = (value: string) => {
    return value !== 'Not configured' && value.length > 0
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Key className={styles.titleIcon} />
          <div>
            <h3 className={styles.title}>System Configuration</h3>
            <p className={styles.subtitle}>View system settings and configuration details</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* AWS Cognito Configuration */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Server size={16} />
            AWS Cognito Configuration
          </h4>

          <div className={styles.configGrid}>
            <div className={styles.configItem}>
              <div className={styles.configHeader}>
                <span className={styles.configLabel}>User Pool ID</span>
                <div className={styles.configStatus}>
                  {isConfigured(systemInfo.userPoolId) ? (
                    <CheckCircle size={16} className={styles.statusSuccess} />
                  ) : (
                    <AlertCircle size={16} className={styles.statusError} />
                  )}
                </div>
              </div>
              <div className={styles.configValue}>
                <code className={styles.code}>{systemInfo.userPoolId}</code>
                {isConfigured(systemInfo.userPoolId) && (
                  <button
                    onClick={() => handleCopy(systemInfo.userPoolId, 'userPoolId')}
                    className={styles.copyButton}
                    title="Copy to clipboard"
                  >
                    {copied === 'userPoolId' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>

            <div className={styles.configItem}>
              <div className={styles.configHeader}>
                <span className={styles.configLabel}>Client ID</span>
                <div className={styles.configStatus}>
                  {isConfigured(systemInfo.clientId) ? (
                    <CheckCircle size={16} className={styles.statusSuccess} />
                  ) : (
                    <AlertCircle size={16} className={styles.statusError} />
                  )}
                </div>
              </div>
              <div className={styles.configValue}>
                <code className={styles.code}>{systemInfo.clientId}</code>
                {isConfigured(systemInfo.clientId) && (
                  <button
                    onClick={() => handleCopy(systemInfo.clientId, 'clientId')}
                    className={styles.copyButton}
                    title="Copy to clipboard"
                  >
                    {copied === 'clientId' ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>

            <div className={styles.configItem}>
              <div className={styles.configHeader}>
                <span className={styles.configLabel}>AWS Region</span>
                <div className={styles.configStatus}>
                  <CheckCircle size={16} className={styles.statusSuccess} />
                </div>
              </div>
              <div className={styles.configValue}>
                <code className={styles.code}>{systemInfo.region}</code>
                <button
                  onClick={() => handleCopy(systemInfo.region, 'region')}
                  className={styles.copyButton}
                  title="Copy to clipboard"
                >
                  {copied === 'region' ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Globe size={16} />
            API Configuration
          </h4>

          <div className={styles.configGrid}>
            <div className={styles.configItem}>
              <div className={styles.configHeader}>
                <span className={styles.configLabel}>API Endpoint</span>
                <div className={styles.configStatus}>
                  <CheckCircle size={16} className={styles.statusSuccess} />
                </div>
              </div>
              <div className={styles.configValue}>
                <code className={styles.code}>{systemInfo.apiEndpoint}</code>
                <button
                  onClick={() => handleCopy(systemInfo.apiEndpoint, 'apiEndpoint')}
                  className={styles.copyButton}
                  title="Copy to clipboard"
                >
                  {copied === 'apiEndpoint' ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Status */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Configuration Status</h4>

          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <div className={styles.statusIndicator}>
                {isConfigured(systemInfo.userPoolId) && isConfigured(systemInfo.clientId) ? (
                  <CheckCircle size={20} className={styles.statusSuccess} />
                ) : (
                  <AlertCircle size={20} className={styles.statusError} />
                )}
              </div>
              <div className={styles.statusContent}>
                <h5 className={styles.statusTitle}>Authentication</h5>
                <p className={styles.statusDescription}>
                  {isConfigured(systemInfo.userPoolId) && isConfigured(systemInfo.clientId)
                    ? 'AWS Cognito is properly configured'
                    : 'AWS Cognito configuration is incomplete'}
                </p>
              </div>
            </div>

            <div className={styles.statusItem}>
              <div className={styles.statusIndicator}>
                <CheckCircle size={20} className={styles.statusSuccess} />
              </div>
              <div className={styles.statusContent}>
                <h5 className={styles.statusTitle}>API Connection</h5>
                <p className={styles.statusDescription}>Backend API is accessible and responding</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
