import { useState } from 'react'
import { Database, Table, BarChart3, RefreshCw, AlertCircle } from 'lucide-react'
import styles from './DatabaseSettings.module.css'

export function DatabaseSettings() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const databaseInfo = {
    type: 'DynamoDB',
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    tables: [
      {
        name: 'igad-prompts',
        status: 'Active',
        itemCount: '~25',
        size: '2.1 KB'
      },
      {
        name: 'igad-comments',
        status: 'Active',
        itemCount: '~8',
        size: '1.3 KB'
      },
      {
        name: 'igad-history',
        status: 'Active',
        itemCount: '~15',
        size: '3.7 KB'
      }
    ]
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false)
    }, 2000)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Database className={styles.titleIcon} />
          <div>
            <h3 className={styles.title}>Database Management</h3>
            <p className={styles.subtitle}>
              Monitor database status and performance
            </p>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          className={styles.refreshButton}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.content}>
        {/* Database Overview */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <BarChart3 size={16} />
            Database Overview
          </h4>
          
          <div className={styles.overviewGrid}>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>Database Type</div>
              <div className={styles.overviewValue}>{databaseInfo.type}</div>
            </div>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>Region</div>
              <div className={styles.overviewValue}>{databaseInfo.region}</div>
            </div>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>Total Tables</div>
              <div className={styles.overviewValue}>{databaseInfo.tables.length}</div>
            </div>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>Billing Mode</div>
              <div className={styles.overviewValue}>On-Demand</div>
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Table size={16} />
            DynamoDB Tables
          </h4>
          
          <div className={styles.tablesContainer}>
            <div className={styles.tablesList}>
              {databaseInfo.tables.map((table) => (
                <div key={table.name} className={styles.tableCard}>
                  <div className={styles.tableHeader}>
                    <div className={styles.tableInfo}>
                      <h5 className={styles.tableName}>{table.name}</h5>
                      <div className={styles.tableStatus}>
                        <div className={`${styles.statusDot} ${styles.statusActive}`}></div>
                        <span className={styles.statusText}>{table.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.tableStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Items</span>
                      <span className={styles.statValue}>{table.itemCount}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Size</span>
                      <span className={styles.statValue}>{table.size}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Maintenance</h4>
          
          <div className={styles.maintenanceInfo}>
            <div className={styles.infoItem}>
              <AlertCircle size={16} className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <h5 className={styles.infoTitle}>Backup Status</h5>
                <p className={styles.infoDescription}>
                  Point-in-time recovery is enabled for all tables. Continuous backups are maintained automatically.
                </p>
              </div>
            </div>
            
            <div className={styles.infoItem}>
              <AlertCircle size={16} className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <h5 className={styles.infoTitle}>Performance</h5>
                <p className={styles.infoDescription}>
                  All tables are using on-demand billing mode for optimal cost and performance scaling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
