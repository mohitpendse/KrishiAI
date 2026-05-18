import React from 'react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Home,
  MapPin,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  User,
  Sprout,
} from 'lucide-react'
import whiteLogo from '../../assets/logo-white.png'

const Sidebar: React.FC = () => {
  const { t } = useLanguage()

  const topNavigation = [
    { nameKey: 'dashboard', href: '/app', icon: Home },
    { nameKey: 'landManagement', href: '/app/land-management', icon: MapPin },
    { nameKey: 'cropRecommendations', href: '/app/crop-recommendations', icon: TrendingUp },
    { nameKey: 'marketplace', href: '/app/marketplace', icon: ShoppingCart },
    { nameKey: 'financialManagement', href: '/app/financial', icon: DollarSign },
  ]

  return (
    <div className="hidden md:flex md:w-64 md:flex-col fixed left-0 top-16 bottom-0 z-30">
      <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-y-auto border-r border-emerald-500/10 bg-white/85 px-3 py-4 text-foreground shadow-2xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-white/65 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
            <img src={whiteLogo} alt="KrishiAI" className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">KrishiAI</p>
            <p className="truncate text-xs text-muted-foreground">Farm command center</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <nav className="space-y-1">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace
            </p>
            {topNavigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.nameKey}
                  to={item.href}
                  end={item.href === '/app'}
                  className={({ isActive }: { isActive: boolean }) =>
                    `group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                        : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground dark:hover:bg-white/10'
                    }`
                  }
                >
                  {({ isActive }: { isActive: boolean }) => {
                    return (
                      <>
                        <span
                          className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full transition-opacity ${
                            isActive ? 'bg-white opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                            isActive
                              ? 'bg-white/15'
                              : 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/15 dark:text-emerald-300'
                          }`}
                        >
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 transition-colors ${
                            isActive
                              ? 'text-primary-foreground'
                              : 'text-muted-foreground group-hover:text-foreground'
                          }`}
                        />
                        </span>
                        <span>{t(item.nameKey)}</span>
                      </>
                    )
                  }}
                </NavLink>
              )
            })}
          </nav>

          <div className="space-y-3 pb-2">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sprout className="h-4 w-4 text-emerald-500" />
                Smart farming
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Track fields, crops, market, and finance in one place.
              </p>
            </div>
            <NavLink
              to="/app/profile"
              className={({ isActive }: { isActive: boolean }) =>
                `group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground dark:hover:bg-white/10'
                }`
              }
            >
              <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 text-sm font-medium">{t('profile')}</div>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
