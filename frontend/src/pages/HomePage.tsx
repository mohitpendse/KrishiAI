import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Leaf,
  Brain,
  TrendingUp,
  Users,
  Shield,
  TestTube,
  type LucideIcon,
} from 'lucide-react'
import logo from '../../assets/logo.png'
import whiteLogo from '../../assets/logo-white.png'
import whiteBanner from '../../assets/banner-white.jpg'
import blackBanner from '../../assets/banner-black.jpg'
import { useTheme } from '../contexts/ThemeContext'
import youtubeIcon from '../../assets/icons/youtube.png'
import instaIcon from '../../assets/icons/insta.png'
import xIcon from '../../assets/icons/X.jpeg'

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  iconBg: string
  iconColor: string
}

const FEATURES: Feature[] = [
  {
    icon: TestTube,
    title: 'Soil Analysis',
    description:
      'Upload soil images or lab reports for AI-powered analysis and personalized crop recommendations.',
    iconBg: 'from-emerald-500/20 to-emerald-600/10',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Brain,
    title: 'AI Market Advisor',
    description:
      'Get intelligent crop recommendations based on soil data, market trends, and seasonal patterns.',
    iconBg: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-600',
  },
  {
    icon: TrendingUp,
    title: 'Market Intelligence',
    description:
      'Access real-time prices, demand forecasts, and profit margin calculations for smarter decisions.',
    iconBg: 'from-amber-500/20 to-amber-600/10',
    iconColor: 'text-amber-600',
  },
  {
    icon: Users,
    title: 'Direct Marketplace',
    description:
      'Sell produce directly to companies and consumers without middlemen and keep more profit.',
    iconBg: 'from-violet-500/20 to-violet-600/10',
    iconColor: 'text-violet-600',
  },
  {
    icon: Shield,
    title: 'Government Schemes',
    description:
      'Discover and apply for schemes and subsidies tailored to your profile and location.',
    iconBg: 'from-rose-500/20 to-rose-600/10',
    iconColor: 'text-rose-600',
  },
  {
    icon: Leaf,
    title: 'Sustainable Farming',
    description:
      'Get guidance on practices that protect the environment and improve long-term soil health.',
    iconBg: 'from-green-500/20 to-green-600/10',
    iconColor: 'text-green-600',
  },
]

const HomePage: React.FC = () => {
  const { actualTheme } = useTheme()
  const bannerSrc = actualTheme === 'light' ? blackBanner : whiteBanner
  const brandLogo = actualTheme === 'light' ? logo : whiteLogo

  return (
    <>
      <Helmet>
        <title>KrishiAI - Smart Farming Companion</title>
        <meta name="description" content="AI-Powered Farming Platform for Indian Farmers" />
      </Helmet>

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

        {/* Top navigation */}
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
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn btn-primary btn-sm sm:btn-md shadow-lg shadow-primary/25"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </header>

        <main className="relative z-10">
          {/* Hero */}
          <section className="px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-20 md:pb-28">
            <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="home-hero-panel px-6 py-10 sm:px-10 sm:py-14 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-emerald-100 mb-6">
                  <Leaf className="h-4 w-4 text-emerald-300" />
                  AI-powered farming for India
                </div>

                <img
                  src={brandLogo}
                  alt=""
                  className="h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-6 float-animation"
                  aria-hidden
                />

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance mb-5">
                  Grow smarter with{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                    KrishiAI
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed text-balance">
                  Analyze soil, plan profitable crops, manage expenses, and sell produce
                  directly — without middlemen.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/register"
                    className="btn btn-primary btn-lg inline-flex items-center justify-center shadow-lg shadow-primary/30 hover-lift"
                  >
                    Start for free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <a
                    href="#features"
                    className="btn btn-lg inline-flex items-center justify-center border border-white/30 bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    Explore features
                  </a>
                </div>

                <div className="mt-10 pt-8 border-t border-white/15 grid grid-cols-3 gap-4 text-center">
                  {[
                    { value: '6+', label: 'Smart tools' },
                    { value: 'AI', label: 'Powered insights' },
                    { value: '24/7', label: 'Market data' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl font-bold text-emerald-300">{stat.value}</p>
                      <p className="text-xs sm:text-sm text-white/60 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section id="features" className="scroll-mt-20 px-4 sm:px-6 lg:px-8 pb-24">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-14 animate-slide-in-up">
                <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3">
                  Platform features
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-balance">
                  Everything you need on one farm dashboard
                </h2>
                <p className="text-lg text-white/65 leading-relaxed">
                  From soil to sale — tools built to help Indian farmers maximize yield
                  and profit.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {FEATURES.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <article
                      key={feature.title}
                      className="home-feature-card p-6 sm:p-7 stagger-item group"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}
                      >
                        <Icon className={`h-7 w-7 ${feature.iconColor}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {feature.description}
                      </p>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 sm:px-6 lg:px-8 pb-20">
            <div className="max-w-3xl mx-auto">
              <div className="home-hero-panel px-8 py-10 sm:py-12 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-balance">
                  Ready to transform your farm?
                </h2>
                <p className="text-white/75 mb-7 max-w-lg mx-auto">
                  Join KrishiAI today and get AI recommendations tailored to your land
                  and local market.
                </p>
                <Link
                  to="/register"
                  className="btn btn-primary btn-lg inline-flex items-center shadow-lg shadow-primary/30 hover-lift"
                >
                  Create your free account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img src={brandLogo} alt="KrishiAI" className="h-8 w-8" />
                <span className="text-xl font-bold">KrishiAI</span>
              </div>
              <p className="text-white/60 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                Empowering farmers with AI for sustainable and profitable agriculture.
              </p>
              <div className="flex justify-center gap-4 mb-6">
                {[
                  { href: 'https://youtube.com/@KrishiAI', icon: youtubeIcon, label: 'YouTube' },
                  { href: 'https://instagram.com/krishi.ai', icon: instaIcon, label: 'Instagram' },
                  { href: 'https://x.com/krishi_ai', icon: xIcon, label: 'X' },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label={social.label}
                  >
                    <img src={social.icon} alt="" className="h-7 w-7" />
                  </a>
                ))}
              </div>
              <p className="text-white/40 text-sm">© 2024 KrishiAI. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default HomePage
