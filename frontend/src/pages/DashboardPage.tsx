import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from 'react-query'
import { api, getWeatherData } from '../utils/api'
import { StatCardSkeleton } from '../components/LoadingSkeleton'
import {
  TrendingUp,
  Sun,
  AlertTriangle,
  DollarSign,
  MapPin,
  Leaf,
} from 'lucide-react'
import blackBanner from '../../assets/banner-black.jpg'
import whiteBanner from '../../assets/banner-white.jpg'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getUserStorageKey } from '../utils/storage'

type DashboardAlert = {
  id: string
  tone: 'danger' | 'warning' | 'info'
  title: string
  description: string
}

type MarketplaceListing = {
  cropName: string
  price: number
  quantity: number
  location: string
}

type StoredField = {
  id: string
  field_size?: number
  coordinates?: {
    cropHistory?: Array<{ crop_name?: string }>
  }
}

type StoredTransaction = {
  id?: string
  date?: string
  transaction_date?: string
  type?: 'income' | 'expense'
  transaction_type?: string
  category?: string
  amount?: number
  crop?: string
}

type DashboardSummary = {
  total_fields: number
  total_fields_change: string
  active_crops: number
  active_crops_change: string
  monthly_income: string
  monthly_income_change: string
  pending_tasks: number
  pending_tasks_change: string
}

const readMarketplaceListings = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getUserStorageKey('krishiai-marketplace-listings'))
    return raw ? (JSON.parse(raw) as MarketplaceListing[]) : []
  } catch {
    return []
  }
}

const readLocalFields = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getUserStorageKey('krishi_fields_v1'))
    return raw ? (JSON.parse(raw) as StoredField[]) : []
  } catch {
    return []
  }
}

const readLocalTransactions = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getUserStorageKey('krishiai-financial-transactions'))
    return raw ? (JSON.parse(raw) as StoredTransaction[]) : []
  } catch {
    return []
  }
}

const parseMoneyValue = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const parsed = Number(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const formatINR = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

const isCurrentMonth = (dateValue?: string) => {
  if (!dateValue) return false
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

const uniqueById = <T extends { id?: string }>(items: T[]) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.id || JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function DashboardPage() {
  const { user } = useAuth()
  const { actualTheme } = useTheme()
  const { t } = useLanguage()
  const banner = actualTheme === 'light' ? blackBanner : whiteBanner
  const farmLocation = user?.farm_location
  const weatherLocation = farmLocation?.address || 'Goa'
  const weatherLat = typeof farmLocation?.lat === 'number' ? farmLocation.lat : undefined
  const weatherLon = typeof farmLocation?.lng === 'number' ? farmLocation.lng : undefined

  const { data: alerts } = useQuery('alerts', async () => {
    const response = await api.get('/alerts/alerts?limit=5')
    return response.data
  })
  const backendAlertCount = Array.isArray(alerts) ? Math.min(alerts.length, 2) : 0

  const { data: liveWeather, isLoading: isWeatherLoading } = useQuery(
    ['weather-current', weatherLocation, weatherLat, weatherLon],
    async () => {
      const response = await getWeatherData({
        location: weatherLocation,
        lat: weatherLat,
        lon: weatherLon,
      })
      return response.data
    }
  )

  const weather = liveWeather || {
    temperature: 32,
    humidity: 65,
    rainfall: 0,
    condition: 'Clear',
    emoji: '☀️',
    location: weatherLocation,
    forecast:
      farmLocation ? 'Fetching exact weather for your saved farm location.' : 'Add your farm location during registration to see exact local weather.',
  }

  const { data: dashboardData, isLoading, refetch: refetchDashboardSummary } = useQuery(
    ['dashboard-summary', backendAlertCount],
    async () => {
      const [fieldsResult, transactionsResult] = await Promise.allSettled([
        api.get('/fields/fields'),
        api.get('/financial/transactions'),
      ])

      const backendFields = fieldsResult.status === 'fulfilled' && Array.isArray(fieldsResult.value.data)
        ? fieldsResult.value.data as StoredField[]
        : []
      const backendTransactions = transactionsResult.status === 'fulfilled' && Array.isArray(transactionsResult.value.data)
        ? transactionsResult.value.data as StoredTransaction[]
        : []

      const localFields = readLocalFields()
      const localTransactions = readLocalTransactions()
      const listings = readMarketplaceListings()
      const fields = uniqueById([...backendFields, ...localFields])
      const transactions = uniqueById([...backendTransactions, ...localTransactions])

      const cropNames = new Set<string>()
      fields.forEach((field) => {
        field.coordinates?.cropHistory?.forEach((entry) => {
          if (entry.crop_name?.trim()) cropNames.add(entry.crop_name.trim().toLowerCase())
        })
      })
      listings.forEach((listing) => {
        if (listing.cropName?.trim()) cropNames.add(listing.cropName.trim().toLowerCase())
      })
      transactions.forEach((transaction) => {
        if (transaction.crop?.trim()) cropNames.add(transaction.crop.trim().toLowerCase())
      })

      const currentMonthIncome = transactions
        .filter((transaction) => (transaction.type || transaction.transaction_type) === 'income')
        .filter((transaction) => isCurrentMonth(transaction.date || transaction.transaction_date))
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

      const fieldsWithoutCrops = fields.filter((field) => !(field.coordinates?.cropHistory || []).length).length
      const marketplaceTasks = listings.length
      const financeTasks = currentMonthIncome > 0 ? 0 : 1
      const alertTasks = backendAlertCount
      const pendingTasks = fieldsWithoutCrops + marketplaceTasks + financeTasks + alertTasks

      return {
        total_fields: fields.length,
        total_fields_change: fields.length > 0 ? `${fields.length} saved` : 'Add first field',
        active_crops: cropNames.size,
        active_crops_change: cropNames.size > 0 ? `${cropNames.size} tracked` : 'Add crop history',
        monthly_income: formatINR(currentMonthIncome),
        monthly_income_change: currentMonthIncome > 0 ? 'From finance records' : 'Add sale income',
        pending_tasks: pendingTasks,
        pending_tasks_change: pendingTasks > 0 ? 'Needs attention' : 'All clear',
      }
    },
    {
      refetchInterval: 5000,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
  )

  useEffect(() => {
    const refreshDashboard = () => {
      refetchDashboardSummary()
    }

    const refreshOnVisibility = () => {
      if (!document.hidden) refreshDashboard()
    }

    window.addEventListener('krishiai:data-updated', refreshDashboard)
    window.addEventListener('storage', refreshDashboard)
    document.addEventListener('visibilitychange', refreshOnVisibility)

    return () => {
      window.removeEventListener('krishiai:data-updated', refreshDashboard)
      window.removeEventListener('storage', refreshDashboard)
      document.removeEventListener('visibilitychange', refreshOnVisibility)
    }
  }, [refetchDashboardSummary])

  const stats = [
    {
      nameKey: 'totalFields',
      value: dashboardData?.total_fields ?? '—',
      icon: MapPin,
      iconBg: 'from-emerald-500/20 to-emerald-600/10',
      iconColor: 'text-emerald-600',
    },
    {
      nameKey: 'activeCrops',
      value: dashboardData?.active_crops ?? '—',
      icon: TrendingUp,
      iconBg: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-600',
    },
    {
      nameKey: 'monthlyIncome',
      value: dashboardData?.monthly_income ?? '—',
      icon: DollarSign,
      iconBg: 'from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-600',
    },
    {
      nameKey: 'pendingTasks',
      value: dashboardData?.pending_tasks ?? '—',
      icon: AlertTriangle,
      iconBg: 'from-rose-500/20 to-rose-600/10',
      iconColor: 'text-rose-600',
    },
  ]

  const userListings = readMarketplaceListings()
  const highestValueListing = [...userListings].sort((a, b) => (b.price * b.quantity) - (a.price * a.quantity))[0]
  const pendingTasks = Number(dashboardData?.pending_tasks || 0)
  const monthlyIncome = parseMoneyValue(dashboardData?.monthly_income)
  const backendAlerts = Array.isArray(alerts) ? alerts : []
  const correlatedAlerts: DashboardAlert[] = (() => {
    const result: DashboardAlert[] = []
    const temperature = Number(weather?.temperature)
    const humidity = Number(weather?.humidity)
    const rainfall = Number(weather?.rainfall || 0)

    if (rainfall > 0 || /rain|storm|drizzle|thunder/i.test(weather?.condition || '')) {
      result.push({
        id: 'weather-rain',
        tone: 'danger',
        title: `Rain risk near ${weather?.location || weatherLocation}`,
        description: `Rainfall is ${rainfall}mm. Pause pesticide spraying, protect stored produce, and delay marketplace pickup until roads are clear.`,
      })
    } else if (temperature >= 35) {
      result.push({
        id: 'weather-heat',
        tone: 'danger',
        title: `High temperature near ${weather?.location || weatherLocation}`,
        description: `${Math.round(temperature)}°C can stress crops. Irrigate early morning and avoid heavy fertilizer application in peak heat.`,
      })
    } else if (humidity >= 80) {
      result.push({
        id: 'weather-humidity',
        tone: 'warning',
        title: 'High humidity watch',
        description: `${humidity}% humidity can increase fungal risk. Inspect leaves before committing spend in Financial Management.`,
      })
    } else {
      result.push({
        id: 'weather-good',
        tone: 'info',
        title: 'Weather supports field work',
        description: `${weather?.condition || 'Current weather'} at ${weather?.location || weatherLocation}. Good window for irrigation checks, harvest planning, and deliveries.`,
      })
    }

    if (highestValueListing) {
      const value = highestValueListing.price * highestValueListing.quantity
      result.push({
        id: 'marketplace-listing',
        tone: 'warning',
        title: `${highestValueListing.cropName} market action`,
        description: `${highestValueListing.quantity} kg listed at ₹${highestValueListing.price}/kg. Potential value is ₹${value.toLocaleString('en-IN')}; check weather before dispatch and record sale income after payment.`,
      })
    } else {
      result.push({
        id: 'marketplace-empty',
        tone: 'warning',
        title: 'Marketplace opportunity',
        description: 'No own crop listing found yet. If harvest is ready and weather is stable, publish it and use Financial Management to track expected sale income.',
      })
    }

    if (monthlyIncome > 0) {
      result.push({
        id: 'finance-income',
        tone: pendingTasks > 0 ? 'warning' : 'info',
        title: 'Finance and task alignment',
        description: `${dashboardData?.monthly_income} recorded this month. Keep input purchases below plan and close ${pendingTasks || 'all'} pending task${pendingTasks === 1 ? '' : 's'} before adding new expenses.`,
      })
    } else {
      result.push({
        id: 'finance-missing',
        tone: 'warning',
        title: 'Financial records need update',
        description: 'Monthly income is not available. Add sales and loan payments in Financial Management so AI plans and dashboard alerts stay accurate.',
      })
    }

    if (backendAlerts.length > 0 && result.length < 5) {
      const alert = backendAlerts[0]
      result.push({
        id: `backend-${alert.id || 'latest'}`,
        tone: 'info',
        title: alert.title || 'AI recommendation',
        description: alert.message || alert.description || 'Review the latest AI alert for your farm.',
      })
    }

    return result.slice(0, 3)
  })()

  const alertToneClass = {
    danger: 'dashboard-alert--danger',
    warning: 'dashboard-alert--warning',
    info: 'dashboard-alert--info',
  }

  const alertDotClass = {
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }

  const alertTextClass = {
    danger: 'text-red-700 dark:text-red-300',
    warning: 'text-amber-800 dark:text-amber-300',
    info: 'text-blue-800 dark:text-blue-300',
  }

  const alertDescriptionClass = {
    danger: 'text-red-600/90 dark:text-red-400/90',
    warning: 'text-amber-700/90 dark:text-amber-400/90',
    info: 'text-blue-700/90 dark:text-blue-400/90',
  }

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Dashboard - KrishiAI</title>
        </Helmet>
        <div className="space-y-6">
          <div className="home-hero-panel h-32 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="home-feature-card h-64 animate-pulse" />
            <div className="home-feature-card h-64 animate-pulse" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - KrishiAI</title>
      </Helmet>

      <div className="space-y-6 w-full min-w-0">
        {/* Welcome */}
        <div className="dashboard-hero home-hero-panel relative overflow-hidden p-4 sm:p-6 lg:p-8">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${banner})` }}
            aria-hidden
          />
          <div className="dashboard-hero-overlay absolute inset-0" aria-hidden />
          <div className="relative z-10 min-w-0">
            <div className="dashboard-hero-badge inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium mb-4">
              <Leaf className="h-3.5 w-3.5 text-emerald-500" />
              {t('farmDashboard')}
            </div>
            <h1 className="dashboard-hero-title text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
              {t('dashboardWelcome', { name: user?.first_name || '' })} 👋
            </h1>
            <p className="dashboard-hero-subtitle text-sm sm:text-base max-w-2xl">
              {t('dashboardSubtitle')}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.nameKey} className="home-feature-card p-6 group hover-lift min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium app-panel-muted">
                      {t(stat.nameKey)}
                    </p>
                    <p className="text-2xl font-bold app-panel-text mt-1 truncate">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weather */}
          <div className="home-feature-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold app-panel-text">
                {t('weatherForecast')}
              </h3>
              {weather?.emoji ? (
                <span className="text-2xl" title={weather.condition}>
                  {weather.emoji}
                </span>
              ) : (
                <Sun className="h-6 w-6 text-amber-500" />
              )}
            </div>
            <div className="space-y-3">
              {[
                { labelKey: 'temperature', value: weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : '—' },
                { labelKey: 'humidity', value: weather?.humidity != null ? `${weather.humidity}%` : '—' },
                { labelKey: 'rainfall', value: weather?.rainfall != null ? `${weather.rainfall}mm` : '—' },
              ].map((row) => (
                <div
                  key={row.labelKey}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <span className="text-sm app-panel-muted">{t(row.labelKey)}</span>
                  <span className="font-semibold app-panel-text">{row.value}</span>
                </div>
              ))}
              <div className="mt-4 p-4 rounded-lg border border-emerald-500/15 bg-emerald-500/5">
                <p className="text-sm app-panel-text">
                  <span className="font-medium">{t('locationLabel')}:</span>{' '}
                  {isWeatherLoading ? t('loading') : weather?.location || t('loading')}
                </p>
                <p className="text-sm app-panel-muted mt-1">
                  {isWeatherLoading ? t('fetchingWeather') : weather?.forecast || t('fetchingWeather')}
                </p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="home-feature-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold app-panel-text">
                {t('recentAlerts')}
              </h3>
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-3">
              {correlatedAlerts.map((alert) => (
                <div key={alert.id} className={`dashboard-alert ${alertToneClass[alert.tone]}`}>
                  <div className={`w-2 h-2 ${alertDotClass[alert.tone]} rounded-full mt-2 shrink-0`} />
                  <div>
                    <p className={`text-sm font-medium ${alertTextClass[alert.tone]}`}>
                      {alert.title}
                    </p>
                    <p className={`text-xs ${alertDescriptionClass[alert.tone]} mt-0.5`}>
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* News */}
        <section>
          <div className="home-hero-panel px-5 py-4 mb-5">
            <h3 className="dashboard-section-title flex items-center gap-2">
              🔔 {t('latestNews')}
            </h3>
          </div>
          <NewsGrid />
        </section>
      </div>
    </>
  )
}

export default DashboardPage

function NewsGrid() {
  const { t } = useLanguage()
  const { data } = useQuery('news-articles', async () => {
    try {
      const resp = await api.get('/news/articles?limit=6')
      return resp.data
    } catch {
      return null
    }
  })

  const fetched = Array.isArray(data) ? data : []

  const fallbackArticles = [
    {
      id: 'f1',
      title: 'No news available — try running the backend news fetcher',
      content: 'Run the backend endpoint /api/news/fetch-news to seed some sample articles.',
      source: 'KrishiAI',
    },
    {
      id: 'f2',
      title: 'Tomato Prices Rise in Major Markets',
      content: 'Tomato prices have risen by 15% due to supply shortages.',
      source: 'Market',
    },
    {
      id: 'f3',
      title: 'New Subsidy Scheme Announced for Small Farmers',
      content: 'Government announces subsidies for equipment purchases.',
      source: 'PIB',
    },
    {
      id: 'f4',
      title: 'Drought-Resistant Crop Varieties Show Promise',
      content:
        'New drought-resistant crop varieties developed by research institutes are showing promising results in field trials.',
      source: 'ICAR',
    },
    {
      id: 'f5',
      title: 'Organic Farming Gains Popularity',
      content: 'Organic farming is gaining popularity among urban consumers.',
      source: 'Organic Farming Association',
    },
    {
      id: 'f6',
      title: 'AI-Powered Soil Analysis Revolutionizes Farming',
      content:
        'A new AI-powered soil analysis technology can analyze soil composition using advanced ML algorithms.',
      source: 'Krishi Jagran',
    },
  ]

  const articles = (() => {
    const result = [...fetched]
    let i = 0
    while (result.length < 6) {
      const next = fallbackArticles[i % fallbackArticles.length]
      result.push({ ...next, id: `${next.id}-pad-${i}` })
      i++
    }
    return result.slice(0, 6)
  })()

  const [selected, setSelected] = useState<{
    id: string
    title: string
    content: string
    source: string
    source_url?: string
  } | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((a) => (
          <article
            key={a.id}
            className="home-feature-card p-4 sm:p-5 group hover-lift flex flex-col"
          >
            <h4 className="font-semibold app-panel-text mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {a.title}
            </h4>
            <p className="text-sm app-panel-muted line-clamp-2 mb-4 flex-1">
              {a.content}
            </p>
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
              <span className="text-xs app-panel-muted">{a.source}</span>
              {a.source_url ? (
                <a
                  href={a.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                >
                  {t('readMore')}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelected(a)}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                >
                  {t('readMore')}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
            aria-hidden
          />
          <div className="home-hero-panel relative z-10 max-w-3xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-semibold dashboard-hero-title mb-2">{selected.title}</h3>
            <p className="text-sm dashboard-hero-subtitle mb-4">
              {t('source')}: {selected.source}
            </p>
            <div className="text-sm dashboard-hero-subtitle leading-relaxed">{selected.content}</div>
            <div className="mt-6 flex justify-end gap-2">
              {selected.source_url ? (
                <a
                  href={selected.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline border-white/30 text-foreground hover:bg-white/10"
                >
                  {t('openSource')}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn btn-primary"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
