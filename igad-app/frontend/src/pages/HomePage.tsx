import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Search, Edit, Mail, Briefcase } from 'lucide-react'
import { useResponsiveIconSize } from '../shared/hooks/useResponsiveIconSize'
import styles from './HomePage.module.css'

/**
 * HomePage Component
 *
 * Main landing page for the IGAD Innovation Hub displaying available AI-powered tools
 * and services for agricultural experts, policy makers, and development professionals.
 *
 * Features:
 * - Hero section with IGAD branding and mission statement
 * - Grid of AI tool cards (both available and coming soon)
 * - Responsive design for mobile, tablet, and desktop
 * - Accessibility compliant with ARIA labels and semantic HTML
 *
 * @returns {JSX.Element} The HomePage component
 */
export function HomePage() {
  // Responsive icon sizing: 24px (mobile) -> 28px (tablet) -> 32px (desktop)
  const iconSize = useResponsiveIconSize()

  return (
    <div className={styles.container}>
      {/* ===========================
          HERO SECTION
          =========================== */}
      <section className={styles.heroSection} aria-label="Hero section">
        <div className={styles.heroContainer}>
          {/* IGAD Logo and Tagline */}
          <div className={styles.heroHeader}>
            <img
              src="/igad-logo.png"
              alt="IGAD Innovation Hub"
              className={styles.heroLogo}
              loading="eager"
            />
            <p className={styles.tagline}>PEACE, PROSPERITY AND REGIONAL INTEGRATION</p>
          </div>

          {/* Main Content */}
          <div className={styles.heroContent}>
            <h1 className={styles.title}>AI-Powered Agricultural Intelligence Hub</h1>
            <p className={styles.subtitle}>
              Empowering agricultural experts across the IGAD region with intelligent tools for
              policy analysis, report generation, and strategic communication
            </p>
          </div>
        </div>
      </section>

      {/* ===========================
          TOOLS SECTION
          =========================== */}
      <section className={styles.toolsSection} aria-labelledby="tools-heading">
        <div className={styles.toolsContainer}>
          {/* Section Header */}
          <header className={styles.sectionHeader}>
            <h2 id="tools-heading" className={styles.sectionTitle}>
              AI-Powered Tools & Services
            </h2>
            <p className={styles.sectionSubtitle}>
              Choose from our suite of specialized tools designed for agricultural experts, policy
              makers, and development professionals.
            </p>
          </header>

          {/* Tools Grid */}
          <div className={styles.toolsGrid} role="list">
            {/* Tool Card: Proposal Writer (Available) */}
            <article className={`${styles.toolCard} ${styles.toolCardAvailable}`} role="listitem">
              <span
                className={`${styles.badge} ${styles.badgeAvailable}`}
                aria-label="Status: Available"
              >
                Available
              </span>
              <div
                className={`${styles.iconContainer} ${styles.iconContainerAvailable}`}
                aria-hidden="true"
              >
                <Edit size={iconSize} color="#008236" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Proposal Writer</h3>
              <p className={styles.toolDescription}>
                Create compelling funding proposals for agricultural initiatives
              </p>
              <Link
                to="/proposal-writer"
                className={`${styles.toolButton} ${styles.toolButtonAvailable}`}
                aria-label="Launch Proposal Writer tool"
              >
                Launch Tool
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>

            {/* Tool Card: Newsletter Generator (Available) */}
            <article className={`${styles.toolCard} ${styles.toolCardAvailable}`} role="listitem">
              <span
                className={`${styles.badge} ${styles.badgeAvailable}`}
                aria-label="Status: Available"
              >
                Available
              </span>
              <div
                className={`${styles.iconContainer} ${styles.iconContainerAvailable}`}
                aria-hidden="true"
              >
                <Mail size={iconSize} color="#008236" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Newsletter Generator</h3>
              <p className={styles.toolDescription}>
                Create engaging newsletters on agricultural innovations and policy updates
              </p>
              <Link
                to="/newsletter-generator"
                className={`${styles.toolButton} ${styles.toolButtonAvailable}`}
                aria-label="Launch Newsletter Generator tool"
              >
                Launch Tool
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>

            {/* Tool Card: Report Generator (Coming Soon) */}
            <article className={`${styles.toolCard} ${styles.toolCardDisabled}`} role="listitem">
              <span
                className={`${styles.badge} ${styles.badgeComingSoon}`}
                aria-label="Status: Coming Soon"
              >
                Coming Soon
              </span>
              <div
                className={`${styles.iconContainer} ${styles.iconContainerDisabled}`}
                aria-hidden="true"
              >
                <BarChart3 size={iconSize} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Report Generator</h3>
              <p className={styles.toolDescription}>
                Generate comprehensive agricultural and policy reports with AI assistance
              </p>
              <button
                className={`${styles.toolButton} ${styles.toolButtonDisabled}`}
                disabled
                aria-label="Report Generator tool coming soon"
              >
                Coming Soon
              </button>
            </article>

            {/* Tool Card: Policy Analyzer (Coming Soon) */}
            <article className={`${styles.toolCard} ${styles.toolCardDisabled}`} role="listitem">
              <span
                className={`${styles.badge} ${styles.badgeComingSoon}`}
                aria-label="Status: Coming Soon"
              >
                Coming Soon
              </span>
              <div
                className={`${styles.iconContainer} ${styles.iconContainerDisabled}`}
                aria-hidden="true"
              >
                <Search size={iconSize} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Policy Analyzer</h3>
              <p className={styles.toolDescription}>
                Analyze and review regional policies for agricultural development
              </p>
              <button
                className={`${styles.toolButton} ${styles.toolButtonDisabled}`}
                disabled
                aria-label="Policy Analyzer tool coming soon"
              >
                Coming Soon
              </button>
            </article>

            {/* Tool Card: Agribusiness Hub (Coming Soon) */}
            <article className={`${styles.toolCard} ${styles.toolCardDisabled}`} role="listitem">
              <span
                className={`${styles.badge} ${styles.badgeComingSoon}`}
                aria-label="Status: Coming Soon"
              >
                Coming Soon
              </span>
              <div
                className={`${styles.iconContainer} ${styles.iconContainerDisabled}`}
                aria-hidden="true"
              >
                <Briefcase size={iconSize} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3 className={styles.toolTitle}>Agribusiness Hub</h3>
              <p className={styles.toolDescription}>
                Connect with agribusiness development opportunities across the region
              </p>
              <button
                className={`${styles.toolButton} ${styles.toolButtonDisabled}`}
                disabled
                aria-label="Agribusiness Hub tool coming soon"
              >
                Coming Soon
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* ===========================
          FOOTER
          =========================== */}
      <footer className={styles.footer} role="contentinfo">
        <p className={styles.footerText}>
          &copy; 2025 IGAD - Intergovernmental Authority on Development
        </p>
        <p className={styles.footerSubtext}>
          Advancing agricultural innovation and regional integration across East Africa
        </p>
      </footer>
    </div>
  )
}
