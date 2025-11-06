import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function HomePage() {
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#FFFFFF' }}>
      {/* Hero Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '48px 79px 1px',
        width: '100%',
        height: '574px',
        background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
        borderBottom: '1px solid #DCFCE7'
      }}>
        <div style={{ width: '100%', maxWidth: '1504px', margin: '0 auto' }}>
          {/* IGAD Logo */}
          <div style={{ margin: '0 auto 32px', textAlign: 'center' }}>
            <img 
              src="/igad-logo.png" 
              alt="IGAD Innovation Hub" 
              style={{
                height: '96px',
                width: 'auto'
              }}
            />
          </div>
          
          {/* Main Heading */}
          <h1 style={{
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Arial',
            fontWeight: '400',
            fontSize: '48px',
            lineHeight: '48px',
            letterSpacing: '-1.2px',
            color: '#016630',
            marginBottom: '16px'
          }}>
            AI-Powered Agricultural Intelligence Hub
          </h1>
          
          {/* Subtitle */}
          <p style={{
            width: '768px',
            margin: '0 auto 48px',
            textAlign: 'center',
            fontFamily: 'Arial',
            fontWeight: '400',
            fontSize: '20px',
            lineHeight: '32px',
            color: '#008236'
          }}>
            Empowering agricultural experts across the IGAD region with cutting-edge AI tools
          </p>
          
          {/* Mission Card */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '32px 0px 32px 32px',
            gap: '40px',
            width: '896px',
            height: '188px',
            margin: '0 auto',
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid #B9F8CF',
            boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
            borderRadius: '14px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              width: '830px',
              height: '24px'
            }}>
              <div style={{ width: '48px', height: '2px', background: '#00A63E' }} />
              <span style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '16px',
                lineHeight: '24px',
                textAlign: 'center',
                color: '#016630'
              }}>
                PEACE, PROSPERITY AND REGIONAL INTEGRATION
              </span>
              <div style={{ width: '48px', height: '2px', background: '#00A63E' }} />
            </div>
            <p style={{
              width: '830px',
              fontFamily: 'Arial',
              fontWeight: '400',
              fontSize: '18px',
              lineHeight: '29px',
              textAlign: 'center',
              color: '#364153'
            }}>
              Supporting the Intergovernmental Authority on Development in advancing agricultural innovation and regional integration
            </p>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div style={{ padding: '64px 63px', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: '1504px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{
              fontFamily: 'Arial',
              fontWeight: '400',
              fontSize: '30px',
              lineHeight: '36px',
              textAlign: 'center',
              color: '#016630',
              marginBottom: '16px'
            }}>
              AI-Powered Tools & Services
            </h2>
            <p style={{
              width: '672px',
              margin: '0 auto',
              fontFamily: 'Arial',
              fontWeight: '400',
              fontSize: '18px',
              lineHeight: '28px',
              textAlign: 'center',
              color: '#4A5565'
            }}>
              Choose from our suite of specialized tools designed to enhance agricultural productivity
            </p>
          </div>

          {/* Tools Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 362px)',
            gap: '32px',
            justifyContent: 'center',
            width: '1152px',
            margin: '0 auto'
          }}>
            {/* Report Generator - Coming Soon */}
            <div style={{
              position: 'relative',
              width: '362px',
              height: '324px',
              background: '#FFFFFF',
              opacity: '0.75',
              border: '2px solid #E5E7EB',
              borderRadius: '14px',
              padding: '34px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '16px 16px 0px',
                width: '64px',
                height: '64px',
                background: '#F3F4F6',
                borderRadius: '14px',
                marginBottom: '24px'
              }}>
                <div style={{ width: '32px', height: '32px', border: '2.67px solid #6A7282' }} />
              </div>
              <h3 style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '20px',
                lineHeight: '28px',
                color: '#101828',
                marginBottom: '12px'
              }}>
                Report Generator
              </h3>
              <p style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '16px',
                lineHeight: '26px',
                color: '#4A5565',
                marginBottom: '24px'
              }}>
                Generate comprehensive agricultural and policy reports
              </p>
              <button style={{
                width: '294px',
                height: '36px',
                background: '#FFFFFF',
                opacity: '0.5',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#0A0A0A'
              }}>
                Coming Soon
              </button>
              <div style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                display: 'flex',
                padding: '4px 12px',
                background: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '999px'
              }}>
                <span style={{
                  fontFamily: 'Arial',
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#4A5565'
                }}>
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Policy Analyzer - Coming Soon */}
            <div style={{
              position: 'relative',
              width: '362px',
              height: '324px',
              background: '#FFFFFF',
              opacity: '0.75',
              border: '2px solid #E5E7EB',
              borderRadius: '14px',
              padding: '34px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '16px 16px 0px',
                width: '64px',
                height: '64px',
                background: '#F3F4F6',
                borderRadius: '14px',
                marginBottom: '24px'
              }}>
                <div style={{ width: '32px', height: '32px', border: '2.67px solid #6A7282' }} />
              </div>
              <h3 style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '20px',
                lineHeight: '28px',
                color: '#101828',
                marginBottom: '12px'
              }}>
                Policy Analyzer
              </h3>
              <p style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '16px',
                lineHeight: '26px',
                color: '#4A5565',
                marginBottom: '24px'
              }}>
                Analyze and review regional policies for agricultural development
              </p>
              <button style={{
                width: '294px',
                height: '36px',
                background: '#FFFFFF',
                opacity: '0.5',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#0A0A0A'
              }}>
                Coming Soon
              </button>
              <div style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                display: 'flex',
                padding: '4px 12px',
                background: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '999px'
              }}>
                <span style={{
                  fontFamily: 'Arial',
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#4A5565'
                }}>
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Proposal Writer - Available */}
            <div style={{
              position: 'relative',
              width: '362px',
              height: '324px',
              background: '#FFFFFF',
              border: '2px solid #B9F8CF',
              borderRadius: '14px',
              padding: '34px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '16px 16px 0px',
                width: '64px',
                height: '64px',
                background: '#DCFCE7',
                borderRadius: '14px',
                marginBottom: '24px'
              }}>
                <div style={{ width: '32px', height: '32px', border: '2.67px solid #008236' }} />
              </div>
              <h3 style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '20px',
                lineHeight: '28px',
                color: '#101828',
                marginBottom: '12px'
              }}>
                Proposal Writer
              </h3>
              <p style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '16px',
                lineHeight: '26px',
                color: '#4A5565',
                marginBottom: '24px'
              }}>
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
                  color: '#FFFFFF'
                }}
              >
                Launch Tool
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
              <div style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                display: 'flex',
                padding: '4px 12px',
                background: '#DCFCE7',
                border: '1px solid #B9F8CF',
                borderRadius: '999px'
              }}>
                <span style={{
                  fontFamily: 'Arial',
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#016630'
                }}>
                  Available
                </span>
              </div>
            </div>

            {/* Newsletter Generator - Available */}
            <div style={{
              position: 'relative',
              width: '362px',
              height: '350px',
              background: '#FFFFFF',
              border: '2px solid #B9F8CF',
              borderRadius: '14px',
              padding: '34px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '16px 16px 0px',
                width: '64px',
                height: '64px',
                background: '#DCFCE7',
                borderRadius: '14px',
                marginBottom: '24px'
              }}>
                <div style={{ width: '32px', height: '32px', border: '2.67px solid #008236' }} />
              </div>
              <h3 style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '20px',
                lineHeight: '28px',
                color: '#101828',
                marginBottom: '12px'
              }}>
                Newsletter Generator
              </h3>
              <p style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '16px',
                lineHeight: '26px',
                color: '#4A5565',
                marginBottom: '50px'
              }}>
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
                  color: '#FFFFFF'
                }}
              >
                Launch Tool
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
              <div style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                display: 'flex',
                padding: '4px 12px',
                background: '#DCFCE7',
                border: '1px solid #B9F8CF',
                borderRadius: '999px'
              }}>
                <span style={{
                  fontFamily: 'Arial',
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#016630'
                }}>
                  Available
                </span>
              </div>
            </div>

            {/* Agribusiness Hub - Coming Soon */}
            <div style={{
              position: 'relative',
              width: '362px',
              height: '350px',
              background: '#FFFFFF',
              opacity: '0.75',
              border: '2px solid #E5E7EB',
              borderRadius: '14px',
              padding: '34px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '16px 16px 0px',
                width: '64px',
                height: '64px',
                background: '#F3F4F6',
                borderRadius: '14px',
                marginBottom: '24px'
              }}>
                <div style={{ width: '32px', height: '32px', border: '2.67px solid #6A7282' }} />
              </div>
              <h3 style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '20px',
                lineHeight: '28px',
                color: '#101828',
                marginBottom: '12px'
              }}>
                Agribusiness Hub
              </h3>
              <p style={{
                fontFamily: 'Arial',
                fontWeight: '400',
                fontSize: '16px',
                lineHeight: '26px',
                color: '#4A5565',
                marginBottom: '50px'
              }}>
                Connect with agribusiness development opportunities
              </p>
              <button style={{
                width: '294px',
                height: '36px',
                background: '#FFFFFF',
                opacity: '0.5',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#0A0A0A'
              }}>
                Coming Soon
              </button>
              <div style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                display: 'flex',
                padding: '4px 12px',
                background: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '999px'
              }}>
                <span style={{
                  fontFamily: 'Arial',
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#4A5565'
                }}>
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '0px 16px',
        gap: '8px',
        width: '100%',
        height: '52px',
        background: '#016630'
      }}>
        <p style={{
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Arial',
          fontWeight: '400',
          fontSize: '16px',
          lineHeight: '24px',
          color: '#DCFCE7',
          margin: '0'
        }}>
          © 2024 IGAD - Intergovernmental Authority on Development
        </p>
        <p style={{
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Arial',
          fontWeight: '400',
          fontSize: '14px',
          lineHeight: '20px',
          color: '#B9F8CF',
          margin: '0'
        }}>
          Advancing agricultural innovation and regional integration
        </p>
      </div>

      {/* View Docs Button */}
      <button style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        width: '121.55px',
        height: '56px',
        right: '145px',
        top: '864px',
        background: '#155DFC',
        boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        border: 'none',
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#FFFFFF',
        cursor: 'pointer'
      }}>
        <div style={{ width: '16px', height: '16px', background: '#FFFFFF' }} />
        View Docs
      </button>
    </div>
  )
}
