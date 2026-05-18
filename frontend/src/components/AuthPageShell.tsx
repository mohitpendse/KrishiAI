import React from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/logo.png'
import whiteLogo from '../../assets/logo-white.png'
import whiteBanner from '../../assets/banner-white.jpg'
import blackBanner from '../../assets/banner-black.jpg'
import { useTheme } from '../contexts/ThemeContext'

type AuthPageShellProps = {
  title: string
  subtitle: React.ReactNode
  children: React.ReactNode
  alternateAuth?: { to: string; label: string }
  maxWidth?: 'max-w-md' | 'max-w-lg'
}

const AuthPageShell: React.FC<AuthPageShellProps> = ({
  title,
  subtitle,
  children,
  alternateAuth,
  maxWidth = 'max-w-md',
}) => {
  const { actualTheme } = useTheme()
  const bannerSrc = actualTheme === 'light' ? blackBanner : whiteBanner
  const brandLogo = actualTheme === 'light' ? logo : whiteLogo

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        backgroundImage: `url(${bannerSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 home-overlay pointer-events-none" aria-hidden />

      <header className="relative z-20 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={brandLogo}
              alt="KrishiAI"
              className="h-9 w-9 transition-transform group-hover:scale-105"
            />
            <span className="text-lg font-bold tracking-tight">KrishiAI</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {alternateAuth && (
              <Link
                to={alternateAuth.to}
                className="btn btn-primary btn-sm sm:btn-md shadow-lg shadow-primary/25"
              >
                {alternateAuth.label}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className={`${maxWidth} w-full animate-fade-in`}>
          <div className="home-hero-panel px-6 py-8 sm:px-10 sm:py-10">
            <div className="text-center mb-8">
              <img
                src={brandLogo}
                alt="KrishiAI"
                className="h-14 w-14 mx-auto mb-5"
              />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                {title}
              </h1>
              <div className="text-sm text-white/70">{subtitle}</div>
            </div>
            {children}
          </div>

          <p className="text-center mt-6">
            <Link
              to="/"
              className="text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default AuthPageShell
