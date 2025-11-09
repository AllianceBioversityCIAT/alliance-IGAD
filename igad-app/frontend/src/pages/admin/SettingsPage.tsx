import { useState } from 'react'
import { Settings, Users, Shield, Key, Database } from 'lucide-react'
import { UserManagement } from './components/UserManagement'
import { GroupManagement } from './components/GroupManagement'
import { SystemSettings } from './components/SystemSettings'
import { DatabaseSettings } from './components/DatabaseSettings'
import styles from './SettingsPage.module.css'

type SettingsTab = 'users' | 'security' | 'system' | 'database'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users')

  const tabs = [
    {
      id: 'users' as SettingsTab,
      label: 'User Management',
      icon: Users,
      description: 'Manage users, roles, and permissions'
    },
    {
      id: 'security' as SettingsTab,
      label: 'Security',
      icon: Shield,
      description: 'Security settings and authentication'
    },
    {
      id: 'system' as SettingsTab,
      label: 'System',
      icon: Key,
      description: 'System configuration and API keys',
      disabled: true
    },
    {
      id: 'database' as SettingsTab,
      label: 'Database',
      icon: Database,
      description: 'Database settings and maintenance',
      disabled: true
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />
      case 'security':
        return <GroupManagement />
      case 'system':
        return <SystemSettings />
      case 'database':
        return <DatabaseSettings />
      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Settings className={styles.titleIcon} />
          <div>
            <h1 className={styles.title}>Settings</h1>
            <p className={styles.subtitle}>
              Manage system configuration, users, and security settings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <nav className={styles.nav}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ''} ${tab.disabled ? styles.disabled : ''}`}
                >
                  <Icon size={20} />
                  <div className={styles.navItemContent}>
                    <span className={styles.navItemLabel}>{tab.label}</span>
                    <span className={styles.navItemDescription}>{tab.description}</span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className={styles.main}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
