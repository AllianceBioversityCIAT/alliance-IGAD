import { Link } from 'react-router-dom'
import { Play, FileText, Sparkles, CheckCircle, ArrowRight } from 'lucide-react'
import styles from './GuidePage.module.css'

const VIDEO_URL =
  'https://marlo-setup.s3.us-east-1.amazonaws.com/media/Proposal%20Writer%20Video%20-%202026_01_27.mp4'

const features = [
  {
    icon: FileText,
    title: 'Upload Your RFP',
    description: 'Simply upload your Request for Proposal and let our AI analyze its requirements.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Analysis',
    description:
      'Our intelligent system extracts key information and generates a tailored proposal structure.',
  },
  {
    icon: CheckCircle,
    title: 'Review & Export',
    description:
      'Review the generated proposal, make adjustments, and export to Word format instantly.',
  },
]

export function GuidePage() {
  return (
    <div className={styles.container}>
      {/* Left Column - Content */}
      <div className={styles.leftColumn}>
        <div className={styles.contentWrapper}>
          {/* Logo */}
          <Link to="/" className={styles.logoLink}>
            <img src="/logologin.png" alt="IGAD Innovation Hub" className={styles.logo} />
          </Link>

          {/* Hero Section */}
          <div className={styles.heroSection}>
            <div className={styles.badge}>
              <Play size={14} />
              <span>Video Tutorial</span>
            </div>
            <h1 className={styles.title}>Proposal Writer Guide</h1>
            <p className={styles.subtitle}>
              Learn how to create professional grant proposals in minutes using our AI-powered
              Proposal Writer tool.
            </p>
          </div>

          {/* Video Player */}
          <div className={styles.videoContainer}>
            <video
              className={styles.video}
              controls
              poster="/hero-background.png"
              preload="metadata"
            >
              <source src={VIDEO_URL} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Features Grid */}
          <div className={styles.featuresSection}>
            <h2 className={styles.featuresTitle}>How It Works</h2>
            <div className={styles.featuresGrid}>
              {features.map((feature, index) => (
                <div key={index} className={styles.featureCard}>
                  <div className={styles.featureIconWrapper}>
                    <feature.icon size={24} strokeWidth={1.5} />
                  </div>
                  <div className={styles.featureContent}>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className={styles.ctaSection}>
            <p className={styles.ctaText}>Ready to streamline your proposal writing process?</p>
            <Link to="/login" className={styles.ctaButton}>
              Get Started
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <p className={styles.footerText}>
              IGAD Innovation Hub - Empowering agricultural development through AI
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
