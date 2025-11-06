import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileText, Mail, Users, TrendingUp, Filter } from 'lucide-react'
import styles from './DashboardPage.module.css'

const metrics = [
  {
    title: 'Total Proposals',
    value: '24',
    change: '+12%',
    trend: 'up',
    icon: FileText
  },
  {
    title: 'Newsletters Sent',
    value: '156',
    change: '+8%',
    trend: 'up',
    icon: Mail
  },
  {
    title: 'Active Users',
    value: '89',
    change: '+15%',
    trend: 'up',
    icon: Users
  },
  {
    title: 'Engagement Rate',
    value: '67%',
    change: '+3%',
    trend: 'up',
    icon: TrendingUp
  }
]

const activities = [
  {
    id: 1,
    type: 'proposal',
    title: 'Climate Adaptation Proposal',
    user: 'Sarah Johnson',
    timestamp: '2 hours ago',
    status: 'completed',
    progress: 100
  },
  {
    id: 2,
    type: 'newsletter',
    title: 'Weekly IGAD Update',
    user: 'Michael Chen',
    timestamp: '4 hours ago',
    status: 'in-progress',
    progress: 75
  },
  {
    id: 3,
    type: 'proposal',
    title: 'Food Security Initiative',
    user: 'Amina Hassan',
    timestamp: '1 day ago',
    status: 'review',
    progress: 90
  },
  {
    id: 4,
    type: 'newsletter',
    title: 'Policy Brief Newsletter',
    user: 'David Ochieng',
    timestamp: '2 days ago',
    status: 'completed',
    progress: 100
  }
]

export function DashboardPage() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Overview of your IGAD Innovation Hub activity and performance
          </p>
        </div>
        <div className="header-actions">
          <Button variant="outline" size="md">
            <Filter className="icon" />
            Filter
          </Button>
          <Button variant="primary" size="md">
            Export Report
          </Button>
        </div>
      </div>

      <div className="metrics-section">
        <div className="metrics-grid">
          {metrics.map((metric) => {
            const Icon = metric.icon
            
            return (
              <Card key={metric.title} variant="metric" className="metric-card">
                <div className="metric-header">
                  <div className="metric-icon">
                    <Icon className="icon" />
                  </div>
                  <div className="metric-trend">
                    <span className={`trend-indicator trend-${metric.trend}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className="metric-content">
                  <h3 className="metric-value">{metric.value}</h3>
                  <p className="metric-title">{metric.title}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-grid">
          <div className="activity-section">
            <Card className="activity-card">
              <div className="card-header">
                <h2 className="card-title">Recent Activity</h2>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
              
              <div className="activity-list">
                {activities.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {activity.type === 'proposal' ? (
                        <FileText className="icon" />
                      ) : (
                        <Mail className="icon" />
                      )}
                    </div>
                    
                    <div className="activity-content">
                      <h4 className="activity-title">{activity.title}</h4>
                      <p className="activity-meta">
                        by {activity.user} • {activity.timestamp}
                      </p>
                      
                      <div className="activity-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${activity.progress}%` }}
                          />
                        </div>
                        <span className="progress-text">{activity.progress}%</span>
                      </div>
                    </div>
                    
                    <div className="activity-status">
                      <span className={`status-badge status-${activity.status}`}>
                        {activity.status.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="insights-section">
            <Card className="insights-card">
              <div className="card-header">
                <h2 className="card-title">Quick Insights</h2>
              </div>
              
              <div className="insights-content">
                <div className="insight-item">
                  <h4 className="insight-title">Most Active Tool</h4>
                  <p className="insight-value">Proposal Writer</p>
                  <p className="insight-description">
                    Used 3x more than other tools this month
                  </p>
                </div>
                
                <div className="insight-item">
                  <h4 className="insight-title">Peak Usage Time</h4>
                  <p className="insight-value">2:00 PM - 4:00 PM</p>
                  <p className="insight-description">
                    Highest activity during afternoon hours
                  </p>
                </div>
                
                <div className="insight-item">
                  <h4 className="insight-title">Completion Rate</h4>
                  <p className="insight-value">89%</p>
                  <p className="insight-description">
                    Above average completion rate this quarter
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
