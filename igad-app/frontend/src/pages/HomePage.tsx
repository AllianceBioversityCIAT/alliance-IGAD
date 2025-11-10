import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Search, Edit, Mail, Briefcase } from 'lucide-react'
import styles from './HomePage.module.css'

export function HomePage() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContainer}>
          {/* IGAD Logo */}
          <div className={styles.logoContainer}>
            <img src="/igad-logo.png" alt="IGAD Innovation Hub" className={styles.logo} />
          </div>

          {/* Main Heading */}
          <h1 className={styles.title}>AI-Powered Agricultural Intelligence Hub</h1>

          {/* Subtitle */}
          <p className={styles.subtitle}>
            Empowering agricultural experts across the IGAD region with intelligent tools for policy
            analysis, report generation, and strategic communication
          </p>

          {/* Mission Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding:
                'clamp(16px, 4vw, 32px) clamp(16px, 4vw, 32px) clamp(16px, 4vw, 32px) clamp(16px, 4vw, 32px)',
              gap: 'clamp(16px, 3vw, 24px)',
              width: '100%',
              maxWidth: '896px',
              minHeight: '188px',
              margin: '0 auto 48px auto',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid #B9F8CF',
              boxShadow:
                '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
              borderRadius: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                width: '830px',
                height: '24px',
              }}
            >
              <div style={{ width: '48px', height: '2px', background: '#00A63E' }} />
              <span
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '16px',
                  lineHeight: '24px',
                  textAlign: 'center',
                  color: '#016630',
                }}
              >
                PEACE, PROSPERITY AND REGIONAL INTEGRATION
              </span>
              <div style={{ width: '48px', height: '2px', background: '#00A63E' }} />
            </div>
            <p
              style={{
                width: '830px',
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '18px',
                lineHeight: '29px',
                textAlign: 'center',
                color: '#364153',
              }}
            >
              Supporting the Intergovernmental Authority on Development&apos;s mission through
              advanced AI tools that enhance agricultural productivity, policy development, and
              regional cooperation across East Africa.
            </p>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div
        style={{
          padding: 'clamp(32px, 8vw, 64px) clamp(16px, 8vw, 63px)',
          width: '100%',
        }}
      >
        <div style={{ width: '100%', maxWidth: '1504px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 8vw, 64px)' }}>
            <h2
              style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: 'clamp(24px, 4vw, 30px)',
                lineHeight: '1.2',
                textAlign: 'center',
                color: '#016630',
                marginBottom: '16px',
              }}
            >
              AI-Powered Tools & Services
            </h2>
            <p
              style={{
                width: '672px',
                margin: '0 auto',
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '18px',
                lineHeight: '28px',
                textAlign: 'center',
                color: '#4A5565',
              }}
            >
              Choose from our suite of specialized tools designed to enhance agricultural
              productivity
            </p>
          </div>

          {/* Tools Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'clamp(16px, 4vw, 32px)',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '1200px',
              margin: '0 auto',
            }}
          >
            {/* Report Generator - Coming Soon */}
            <div
              className={`${styles.toolCard} ${styles.toolCardDisabled}`}
              style={{
                position: 'relative',
                width: '362px',
                height: '324px',
                background: '#FFFFFF',
                border: '2px solid #E5E7EB',
                borderRadius: '14px',
                padding: '34px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '16px 16px 0px',
                  width: '64px',
                  height: '64px',
                  background: '#F3F4F6',
                  borderRadius: '14px',
                  marginBottom: '24px',
                }}
              >
                <BarChart3 size={32} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '20px',
                  lineHeight: '28px',
                  color: '#101828',
                  marginBottom: '12px',
                }}
              >
                Report Generator
              </h3>
              <p
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '16px',
                  lineHeight: '26px',
                  color: '#4A5565',
                  marginBottom: '24px',
                }}
              >
                Generate comprehensive agricultural and policy reports
              </p>
              <button
                style={{
                  width: '294px',
                  height: '36px',
                  background: '#FFFFFF',
                  opacity: '0.5',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  fontFamily: 'Arial',
                  fontSize: '14px',
                  color: '#0A0A0A',
                }}
              >
                Coming Soon
              </button>
              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  display: 'flex',
                  padding: '4px 12px',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: '999px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: '#4A5565',
                  }}
                >
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Policy Analyzer - Coming Soon */}
            <div
              className={`${styles.toolCard} ${styles.toolCardDisabled}`}
              style={{
                position: 'relative',
                width: '362px',
                height: '324px',
                background: '#FFFFFF',
                border: '2px solid #E5E7EB',
                borderRadius: '14px',
                padding: '34px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '16px 16px 0px',
                  width: '64px',
                  height: '64px',
                  background: '#F3F4F6',
                  borderRadius: '14px',
                  marginBottom: '24px',
                }}
              >
                <Search size={32} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '20px',
                  lineHeight: '28px',
                  color: '#101828',
                  marginBottom: '12px',
                }}
              >
                Policy Analyzer
              </h3>
              <p
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '16px',
                  lineHeight: '26px',
                  color: '#4A5565',
                  marginBottom: '24px',
                }}
              >
                Analyze and review regional policies for agricultural development
              </p>
              <button
                style={{
                  width: '294px',
                  height: '36px',
                  background: '#FFFFFF',
                  opacity: '0.5',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  fontFamily: 'Arial',
                  fontSize: '14px',
                  color: '#0A0A0A',
                }}
              >
                Coming Soon
              </button>
              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  display: 'flex',
                  padding: '4px 12px',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: '999px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: '#4A5565',
                  }}
                >
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Proposal Writer - Available */}
            <div
              className={styles.toolCard}
              style={{
                position: 'relative',
                width: '362px',
                height: '324px',
                background: '#FFFFFF',
                border: '2px solid #B9F8CF',
                borderRadius: '14px',
                padding: '34px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '16px 16px 0px',
                  width: '64px',
                  height: '64px',
                  background: '#DCFCE7',
                  borderRadius: '14px',
                  marginBottom: '24px',
                }}
              >
                <Edit size={32} color="#008236" strokeWidth={2.67} />
              </div>
              <h3
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '20px',
                  lineHeight: '28px',
                  color: '#101828',
                  marginBottom: '12px',
                }}
              >
                Proposal Writer
              </h3>
              <p
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '16px',
                  lineHeight: '26px',
                  color: '#4A5565',
                  marginBottom: '24px',
                }}
              >
                Create compelling funding proposals for agricultural projects
              </p>
              <Link
                to="/proposal-writer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '294px',
                  height: '36px',
                  background: '#00A63E',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontFamily: 'Arial',
                  fontSize: '14px',
                  color: '#FFFFFF',
                }}
              >
                Launch Tool
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  display: 'flex',
                  padding: '4px 12px',
                  background: '#DCFCE7',
                  border: '1px solid #B9F8CF',
                  borderRadius: '999px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: '#016630',
                  }}
                >
                  Available
                </span>
              </div>
            </div>

            {/* Newsletter Generator - Available */}
            <div
              className={styles.toolCard}
              style={{
                position: 'relative',
                width: '362px',
                height: '350px',
                background: '#FFFFFF',
                border: '2px solid #B9F8CF',
                borderRadius: '14px',
                padding: '34px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '16px 16px 0px',
                  width: '64px',
                  height: '64px',
                  background: '#DCFCE7',
                  borderRadius: '14px',
                  marginBottom: '24px',
                }}
              >
                <Mail size={32} color="#008236" strokeWidth={2.67} />
              </div>
              <h3
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '20px',
                  lineHeight: '28px',
                  color: '#101828',
                  marginBottom: '12px',
                }}
              >
                Newsletter Generator
              </h3>
              <p
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '16px',
                  lineHeight: '26px',
                  color: '#4A5565',
                  marginBottom: '50px',
                }}
              >
                Create engaging newsletters on agricultural innovations and updates
              </p>
              <Link
                to="/newsletter-generator"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '294px',
                  height: '36px',
                  background: '#00A63E',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontFamily: 'Arial',
                  fontSize: '14px',
                  color: '#FFFFFF',
                }}
              >
                Launch Tool
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  display: 'flex',
                  padding: '4px 12px',
                  background: '#DCFCE7',
                  border: '1px solid #B9F8CF',
                  borderRadius: '999px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: '#016630',
                  }}
                >
                  Available
                </span>
              </div>
            </div>

            {/* Agribusiness Hub - Coming Soon */}
            <div
              style={{
                position: 'relative',
                width: '362px',
                height: '350px',
                background: '#FFFFFF',
                opacity: '0.75',
                border: '2px solid #E5E7EB',
                borderRadius: '14px',
                padding: '34px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '16px 16px 0px',
                  width: '64px',
                  height: '64px',
                  background: '#F3F4F6',
                  borderRadius: '14px',
                  marginBottom: '24px',
                }}
              >
                <Briefcase size={32} color="#6A7282" strokeWidth={2.67} />
              </div>
              <h3
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '20px',
                  lineHeight: '28px',
                  color: '#101828',
                  marginBottom: '12px',
                }}
              >
                Agribusiness Hub
              </h3>
              <p
                style={{
                  fontFamily: 'Arial',
                  fontWeight: '400',
                  fontSize: '16px',
                  lineHeight: '26px',
                  color: '#4A5565',
                  marginBottom: '50px',
                }}
              >
                Connect with agribusiness development opportunities
              </p>
              <button
                style={{
                  width: '294px',
                  height: '36px',
                  background: '#FFFFFF',
                  opacity: '0.5',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  fontFamily: 'Arial',
                  fontSize: '14px',
                  color: '#0A0A0A',
                }}
              >
                Coming Soon
              </button>
              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  display: 'flex',
                  padding: '4px 12px',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: '999px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: '#4A5565',
                  }}
                >
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          gap: '8px',
          margin: '0',
          background: '#016630',
        }}
      >
        <p
          style={{
            fontFamily: 'Arial',
            fontSize: '16px',
            lineHeight: '24px',
            textAlign: 'center',
            color: '#DCFCE7',
            margin: 0,
          }}
        >
          © 2024 IGAD - Intergovernmental Authority on Development
        </p>
        <p
          style={{
            fontFamily: 'Arial',
            fontSize: '14px',
            lineHeight: '20px',
            textAlign: 'center',
            color: '#FFFFFF',
            margin: 0,
          }}
        >
          Advancing agricultural innovation and regional integration through technology
        </p>
      </div>
    </div>
  )
}
