import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AlertCircle, Droplets, Leaf, Sprout } from 'lucide-react'

const API_BASE = 'http://localhost:8000/api'

interface Field {
  id: string
  field_name: string
  field_size: number
  soil_type?: string
  irrigation_type?: string
  coordinates: {
    cropHistory?: Array<{
      id: string
      crop_name: string
      season: string
      year: string
      yield_per_acre: number
      notes?: string
    }>
    [key: string]: any
  }
}

interface SoilReport {
  id: string
  field_id: string
  report_type: string
  analysis_data: Record<string, any>
  ph_level: number | null
  moisture_content: number | null
  nitrogen_content: number | null
  phosphorus_content: number | null
  potassium_content: number | null
  organic_matter: number | null
  created_at: string
}

interface CropRecommendation {
  id: string
  crop_name: string
  suitability_score: number
  expected_yield: number
  profit_margin: number
  sowing_season: string
  harvest_season: string
  fertilizer_recommendations: {
    nitrogen?: number
    phosphorus?: number
    potassium?: number
    type?: string
  }
  irrigation_schedule: {
    frequency?: string
    amount?: number
    season?: string
  }
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const CropRecommendationsPage: React.FC = () => {
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [soilReports, setSoilReports] = useState<SoilReport[]>([])
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([])
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoadingFields(true)
        const response = await fetch(`${API_BASE}/fields/fields`, { headers: authHeaders() })
        if (!response.ok) throw new Error('Failed to fetch fields')
        const data = await response.json()
        setFields(data)
        setSelectedFieldId(data.length > 0 ? data[0].id : null)
        setError(null)
      } catch (err) {
        setFields([])
        setSelectedFieldId(null)
        setError(err instanceof Error ? err.message : 'Failed to fetch fields')
      } finally {
        setLoadingFields(false)
      }
    }

    fetchFields()
  }, [])

  useEffect(() => {
    if (!selectedFieldId) {
      setSoilReports([])
      setRecommendations([])
      return
    }

    const fetchFieldData = async () => {
      try {
        setLoadingData(true)
        const [soilResponse, cropsResponse] = await Promise.all([
          fetch(`${API_BASE}/soil/reports/${selectedFieldId}`, { headers: authHeaders() }),
          fetch(`${API_BASE}/crops/recommendations?field_id=${selectedFieldId}`, { headers: authHeaders() }),
        ])

        setSoilReports(soilResponse.ok ? await soilResponse.json() : [])
        setRecommendations(cropsResponse.ok ? await cropsResponse.json() : [])
        setError(null)
      } catch (err) {
        setSoilReports([])
        setRecommendations([])
        setError(err instanceof Error ? err.message : 'Failed to fetch recommendations')
      } finally {
        setLoadingData(false)
      }
    }

    fetchFieldData()
  }, [selectedFieldId])

  const selectedField = fields.find((field) => field.id === selectedFieldId)
  const latestReport = soilReports[0]

  return (
    <>
      <Helmet>
        <title>Crop Recommendations - KrishiAI</title>
      </Helmet>

      <div className="app-page">
        <div className="app-page-header">
          <div className="app-page-eyebrow">
            <Sprout className="h-3.5 w-3.5 text-emerald-300" />
            AI crop planning
          </div>
          <h1 className="app-page-title">Crop Recommendations</h1>
          <p className="app-page-subtitle">
            Recommendations appear only after field and soil data are added in Land Management.
          </p>
        </div>

        {error && (
          <div className="app-panel border-red-500/25 bg-red-500/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {loadingFields ? (
          <div className="app-panel text-center py-12">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">Loading fields...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="app-panel text-center py-12">
            <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No field data yet</h3>
            <p className="text-muted-foreground mb-4">
              Create and save a field in Land Management before viewing crop recommendations.
            </p>
            <a href="/app/land-management" className="btn btn-primary btn-sm inline-block">
              Go to Land Management
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="app-panel">
              <h2 className="text-lg font-semibold mb-4">Select Field</h2>
              <div className="flex flex-wrap gap-2">
                {fields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={`app-chip ${selectedFieldId === field.id ? 'app-chip-active' : ''}`}
                  >
                    {field.field_name}
                  </button>
                ))}
              </div>
            </div>

            {selectedField && (
              <div className="app-panel">
                <h2 className="text-lg font-semibold mb-4">Field Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="app-panel-compact">
                    <p className="text-sm text-muted-foreground mb-1">Field</p>
                    <p className="font-semibold">{selectedField.field_name}</p>
                  </div>
                  <div className="app-panel-compact">
                    <p className="text-sm text-muted-foreground mb-1">Size</p>
                    <p className="font-semibold">{Number(selectedField.field_size || 0).toFixed(2)} acres</p>
                  </div>
                  <div className="app-panel-compact">
                    <p className="text-sm text-muted-foreground mb-1">Soil Type</p>
                    <p className="font-semibold">{selectedField.soil_type || 'From soil upload'}</p>
                  </div>
                  <div className="app-panel-compact">
                    <p className="text-sm text-muted-foreground mb-1">Irrigation</p>
                    <p className="font-semibold">{selectedField.irrigation_type || 'Not specified'}</p>
                  </div>
                </div>
                {(selectedField.coordinates?.cropHistory || []).length > 0 && (
                  <div className="mt-5 border-t pt-4">
                    <h3 className="font-semibold mb-3">Crop History Used</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedField.coordinates.cropHistory!.map((entry) => (
                        <div key={entry.id} className="app-panel-compact">
                          <p className="font-semibold">{entry.crop_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[entry.season, entry.year].filter(Boolean).join(' • ')} • {entry.yield_per_acre} per acre
                          </p>
                          {entry.notes && <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loadingData ? (
              <div className="app-panel text-center py-12">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                <p className="text-muted-foreground">Loading soil data...</p>
              </div>
            ) : !latestReport ? (
              <div className="app-panel text-center py-12">
                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No soil upload for this field</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a lab report, field image, or video in Land Management to generate crop recommendations.
                </p>
                <a href="/app/land-management" className="btn btn-primary btn-sm inline-block">
                  Upload Soil Data
                </a>
              </div>
            ) : (
              <>
                <div className="app-panel">
                  <h2 className="text-lg font-semibold mb-4">Soil Analysis Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <SummaryRow label="Report Type" value={latestReport.report_type} />
                      <SummaryRow label="Soil Type" value={latestReport.analysis_data?.soil_type || selectedField?.soil_type || 'Not specified'} />
                      <SummaryRow label="pH Level" value={latestReport.ph_level ?? 'Not available'} />
                      <SummaryRow label="Moisture" value={latestReport.moisture_content != null ? `${latestReport.moisture_content}%` : 'Not available'} />
                    </div>
                    <div className="space-y-3">
                      <SummaryRow label="Nitrogen (N)" value={latestReport.nitrogen_content != null ? `${latestReport.nitrogen_content}` : 'Not available'} />
                      <SummaryRow label="Phosphorus (P)" value={latestReport.phosphorus_content != null ? `${latestReport.phosphorus_content}` : 'Not available'} />
                      <SummaryRow label="Potassium (K)" value={latestReport.potassium_content != null ? `${latestReport.potassium_content}` : 'Not available'} />
                      <SummaryRow label="Organic Matter" value={latestReport.organic_matter != null ? `${latestReport.organic_matter}%` : 'Not available'} />
                    </div>
                  </div>
                  {(latestReport.analysis_data?.conclusion || latestReport.analysis_data?.recommendations?.length > 0) && (
                    <div className="mt-5 border-t pt-4">
                      {latestReport.analysis_data?.conclusion && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {latestReport.analysis_data.conclusion}
                        </p>
                      )}
                      {latestReport.analysis_data?.recommendations?.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {latestReport.analysis_data.recommendations.map((item: string, index: number) => (
                            <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                              <span className="text-primary">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {recommendations.length === 0 ? (
                  <div className="app-panel text-center py-12">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Soil data exists, but no crop recommendations were generated yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Recommended Crops</h2>
                    {recommendations.map((crop) => (
                      <div key={crop.id} className="app-panel border-l-4 border-primary">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold">{crop.crop_name}</h3>
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                                  {(crop.suitability_score * 100).toFixed(0)}% Match
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <div className="h-full bg-gradient-to-r from-green-400 to-green-600" style={{ width: `${crop.suitability_score * 100}%` }} />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Metric icon="🌱" label="Expected Yield" value={`${crop.expected_yield.toFixed(1)} tons/acre`} />
                              <Metric icon="📈" label="Profit Margin" value={`${(crop.profit_margin * 100).toFixed(1)}%`} />
                              <div className="grid grid-cols-2 gap-2">
                                <MiniPanel label="Sowing" value={crop.sowing_season} />
                                <MiniPanel label="Harvest" value={crop.harvest_season} />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <Schedule title="Fertilizer Schedule" items={[
                              ['Nitrogen (N)', crop.fertilizer_recommendations.nitrogen && `${crop.fertilizer_recommendations.nitrogen} kg/acre`],
                              ['Phosphorus (P)', crop.fertilizer_recommendations.phosphorus && `${crop.fertilizer_recommendations.phosphorus} kg/acre`],
                              ['Potassium (K)', crop.fertilizer_recommendations.potassium && `${crop.fertilizer_recommendations.potassium} kg/acre`],
                              ['Recommended', crop.fertilizer_recommendations.type],
                            ]} />
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Droplets className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                <h4 className="font-semibold">Irrigation Schedule</h4>
                              </div>
                              <Schedule items={[
                                ['Frequency', crop.irrigation_schedule.frequency],
                                ['Water Amount', crop.irrigation_schedule.amount && `${crop.irrigation_schedule.amount} mm`],
                                ['Season', crop.irrigation_schedule.season],
                              ]} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

const SummaryRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between border-b pb-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
)

const Metric = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="app-panel-compact flex items-center gap-3">
    <span className="text-2xl">{icon}</span>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  </div>
)

const MiniPanel = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
    <p className="text-xs text-amber-600 dark:text-amber-400">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
)

const Schedule = ({ title, items }: { title?: string; items: Array<[string, React.ReactNode]> }) => (
  <div>
    {title && <h4 className="mb-3 font-semibold">{title}</h4>}
    <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
      {items.filter(([, value]) => Boolean(value)).map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-sm">
          <span className="text-orange-700 dark:text-orange-300">{label}:</span>
          <span className="font-semibold text-right">{value}</span>
        </div>
      ))}
    </div>
  </div>
)

export default CropRecommendationsPage
