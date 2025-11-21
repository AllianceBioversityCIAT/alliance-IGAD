import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Search, Edit, Mail, Briefcase } from 'lucide-react'
import styles from './HomePage.module.css'

export function HomePage() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContainer}>
          {/* IGAD Logo and Tagline */}
          <div className={styles.heroHeader}>
            <img src="/igad-logo.png" alt="IGAD Innovation Hub" className={styles.heroLogo} />
            <p className={styles.tagline}>PEACE, PROSPERITY AND REGIONAL INTEGRATION</p>
          </div>

          {/* Main Content */}
          <div className={styles.heroContent}>
            {/* Main Heading */}
            <h1 className={styles.title}>AI-Powered Agricultural Intelligence Hub</h1>

            {/* Subtitle */}
            <p className={styles.subtitle}>
              Empowering agricultural experts across the IGAD region with intelligent tools for policy
              analysis, report generation, and strategic communication
            </p>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div className={styles.toolsSection}>
        <div className={styles.toolsContainer}>
          {/* Section Header */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>AI-Powered Tools & Services</h2>
            <p className={styles.sectionSubtitle}>
              Choose from our suite of specialized tools designed for agricultural experts, policy makers, and development professionals.
            </p>
          </div>

          {/* Tools Grid */}
          <div className={styles.toolsGrid}>
            {/* 1. Proposal Writer - Available */}
            <div className={`${styles.toolCard} ${styles.toolCardAvailable}`}>
              <span className={`${styles.badge} ${styles.badgeAvailable}`}>Available</span>
              <div className={`${styles.iconContainer} ${styles.iconContainerAvailable}`}>
                <Edit size={32} color="#008236" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Proposal Writer</h3>
              <p className={styles.toolDescription}>
                Create compelling funding proposals for agricultural initiatives
              </p>
              <Link to="/proposal-writer" className={`${styles.toolButton} ${styles.toolButtonAvailable}`}>
                Launch Tool
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* 2. Newsletter Generator - Available */}
            <div className={`${styles.toolCard} ${styles.toolCardAvailable}`}>
              <span className={`${styles.badge} ${styles.badgeAvailable}`}>Available</span>
              <div className={`${styles.iconContainer} ${styles.iconContainerAvailable}`}>
                <Mail size={32} color="#008236" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Newsletter Generator</h3>
              <p className={styles.toolDescription}>
                Create engaging newsletters on agricultural innovations and policy updates
              </p>
              <Link to="/newsletter-generator" className={`${styles.toolButton} ${styles.toolButtonAvailable}`}>
                Launch Tool
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* 3. Report Generator - Coming Soon */}
            <div className={`${styles.toolCard} ${styles.toolCardDisabled}`}>
              <span className={`${styles.badge} ${styles.badgeComingSoon}`}>Coming Soon</span>
              <div className={`${styles.iconContainer} ${styles.iconContainerDisabled}`}>
                <BarChart3 size={32} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Report Generator</h3>
              <p className={styles.toolDescription}>
                Generate comprehensive agricultural and policy reports with AI assistance
              </p>
              <button className={`${styles.toolButton} ${styles.toolButtonDisabled}`}>
                Coming Soon
              </button>
            </div>

            {/* 4. Policy Analyzer - Coming Soon */}
            <div className={`${styles.toolCard} ${styles.toolCardDisabled}`}>
              <span className={`${styles.badge} ${styles.badgeComingSoon}`}>Coming Soon</span>
              <div className={`${styles.iconContainer} ${styles.iconContainerDisabled}`}>
                <Search size={32} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Policy Analyzer</h3>
              <p className={styles.toolDescription}>
                Analyze and review regional policies for agricultural development
              </p>
              <button className={`${styles.toolButton} ${styles.toolButtonDisabled}`}>
                Coming Soon
              </button>
            </div>

            {/* 5. Agribusiness Hub - Coming Soon */}
            <div className={`${styles.toolCard} ${styles.toolCardDisabled}`}>
              <span className={`${styles.badge} ${styles.badgeComingSoon}`}>Coming Soon</span>
              <div className={`${styles.iconContainer} ${styles.iconContainerDisabled}`}>
                <Briefcase size={32} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Agribusiness Hub</h3>
              <p className={styles.toolDescription}>
                Connect with agribusiness development opportunities across the region
              </p>
              <button className={`${styles.toolButton} ${styles.toolButtonDisabled}`}>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p className={styles.footerText}>
          © 2025 IGAD - Intergovernmental Authority on Development
        </p>
        <p className={styles.footerSubtext}>
          Advancing agricultural innovation and regional integration across East Africa
        </p>
      </div>
    </div>
  )
}
