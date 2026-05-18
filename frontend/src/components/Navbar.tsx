import * as React from 'react'
const useState = React.useState
import { Link } from 'react-router-dom'
import { 
  Menu, 
  X, 
  User,
  Sun,
  Moon,
  Globe,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import whiteLogo from '../../assets/logo-white.png'

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()
  const { theme, setTheme, actualTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  ]

  const workspaceNavigation = [
    { nameKey: 'dashboard', href: '/app' },
    { nameKey: 'landManagement', href: '/app/land-management' },
    { nameKey: 'cropRecommendations', href: '/app/crop-recommendations' },
    { nameKey: 'marketplace', href: '/app/marketplace' },
    { nameKey: 'financialManagement', href: '/app/financial' },
  ]

  return (
    <nav className="glass-navbar transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/app" className="flex items-center space-x-2">
              {/* Reverse logo on dashboard route only */}
              {(() => {
                // Use white logo always for visibility on dark backgrounds
                return (
                  <div className="rounded-full p-1.5 bg-white shadow-md hover-scale transition-transform" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={whiteLogo} alt="KrishiAI" className="h-6 w-6" />
                  </div>
                )
              })()}
              <span className="text-xl font-bold text-primary">KrishiAI</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md glass hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
              aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
            >
              {actualTheme === 'light' ? (
                <Moon className="h-5 w-5 text-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-foreground" />
              )}
            </button>

            {/* Language Selector */}
            <div className="relative h-10 w-10">
              <div className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-md glass transition-all duration-200">
                <Globe className="h-5 w-5 text-foreground" />
              </div>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as any)}
                className="absolute inset-0 h-10 w-10 cursor-pointer opacity-0"
                title={t('changeLanguage')}
                aria-label={t('changeLanguage')}
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>


            {/* Profile */}
            <Link
              to="/app/profile"
              className="flex items-center space-x-2 p-2 rounded-md glass hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={t('profile')}
            >
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium hidden sm:inline text-foreground max-w-[120px] truncate">
                {user?.first_name}
              </span>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md glass hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-2 pt-2 pb-3 space-y-1 sm:px-3 glass border-t border-white/10">
            {workspaceNavigation.map((item) => (
              <Link
                key={item.nameKey}
                to={item.href}
                className="block px-3 py-2 rounded-md text-base font-medium glass hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {t(item.nameKey)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
