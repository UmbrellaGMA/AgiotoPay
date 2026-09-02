import React from 'react';

/**
 * AgiotoPay Logo Component
 * Accepts:
 *  - variant: 'full' | 'icon' | 'header' | 'login'
 *  - size: number or string (e.g. 32, 40, '100%')
 *  - className: string
 *  - showSubtitle: boolean
 */
export default function Logo({
  variant = 'full',
  size = 36,
  className = '',
  showSubtitle = true,
  onClick
}) {
  // If icon only variant
  if (variant === 'icon') {
    return (
      <div 
        className={`agiotopay-logo-icon ${className}`} 
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center' }}
      >
        <img 
          src="/logo-icon.png" 
          alt="AgiotoPay Icon" 
          style={{ width: size, height: size, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,115,255,0.3))' }}
        />
      </div>
    );
  }

  // Header / Mobile compact variant
  if (variant === 'header') {
    return (
      <div 
        className={`agiotopay-logo-header ${className}`} 
        onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: onClick ? 'pointer' : 'default' }}
      >
        <img 
          src="/logo-icon.png" 
          alt="AgiotoPay Icon" 
          style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,115,255,0.4))' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.3px' }}>
            <span style={{ color: 'var(--text-primary, #ffffff)' }}>Agioto</span>
            <span style={{ 
              background: 'linear-gradient(135deg, #0073FF 0%, #00D4FF 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              fontWeight: 900 
            }}>Pay</span>
          </span>
        </div>
      </div>
    );
  }

  // Login / Large Prominent variant
  if (variant === 'login') {
    return (
      <div className={`agiotopay-logo-login ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <img 
          src="/logo-icon.png" 
          alt="AgiotoPay Logo" 
          style={{ 
            width: size || 72, 
            height: size || 72, 
            objectFit: 'contain', 
            filter: 'drop-shadow(0 4px 20px rgba(0, 115, 255, 0.45))',
            animation: 'pulseGlow 3s infinite alternate' 
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 900, 
            margin: 0, 
            lineHeight: 1.1, 
            letterSpacing: '-0.5px' 
          }}>
            <span style={{ color: 'var(--text-primary, #ffffff)' }}>Agioto</span>
            <span style={{ 
              background: 'linear-gradient(135deg, #0073FF 0%, #00D4FF 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              fontWeight: 900 
            }}>Pay</span>
          </h1>
          {showSubtitle && (
            <span style={{ 
              fontSize: '0.68rem', 
              fontWeight: 700, 
              letterSpacing: '4px', 
              color: '#00A3FF', 
              textTransform: 'uppercase', 
              display: 'block', 
              marginTop: '4px',
              opacity: 0.9 
            }}>
              E M P R É S T I M O S
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default Full Brand Logo
  return (
    <div 
      className={`agiotopay-logo-full ${className}`} 
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: onClick ? 'pointer' : 'default' }}
    >
      <img 
        src="/logo-icon.png" 
        alt="AgiotoPay" 
        style={{ 
          width: size, 
          height: size, 
          objectFit: 'contain', 
          filter: 'drop-shadow(0 2px 10px rgba(0, 115, 255, 0.35))',
          flexShrink: 0
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1, letterSpacing: '-0.4px' }}>
          <span style={{ color: 'var(--text-primary, #ffffff)' }}>Agioto</span>
          <span style={{ 
            background: 'linear-gradient(135deg, #0073FF 0%, #00D4FF 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            fontWeight: 900 
          }}>Pay</span>
        </div>
        {showSubtitle && (
          <div style={{ 
            fontSize: '0.58rem', 
            fontWeight: 800, 
            letterSpacing: '2.5px', 
            color: '#00A3FF', 
            textTransform: 'uppercase', 
            marginTop: '3px',
            opacity: 0.85 
          }}>
            EMPRÉSTIMOS
          </div>
        )}
      </div>
    </div>
  );
}
