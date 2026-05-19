import React, { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon, FileText, Video, X, CheckCircle, AlertCircle } from 'lucide-react'
import { API_BASE_URL } from '../utils/api'

type AnalysisType = 'image' | 'video' | 'lab'

type Field = {
  id: string
  field_name: string
  field_size: number
  soil_type?: string
}

type AnalysisResult = {
  soilType: string
  pH: string | number
  moisture: string | number
  nitrogen: string | number
  phosphorus: string | number
  potassium: string | number
  organicMatter: string | number
  recommendations: string[]
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const endpointForType = (type: AnalysisType) => {
  if (type === 'image') return 'upload-image'
  if (type === 'video') return 'upload-video'
  return 'upload-lab-report'
}

const formatValue = (value: unknown): string | number => {
  if (typeof value === 'number' || typeof value === 'string') return value
  return '-'
}

const SoilAnalysisPage = () => {
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analysisType, setAnalysisType] = useState<AnalysisType>('image')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFields = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/fields/fields`, { headers: authHeaders() })
        if (!response.ok) throw new Error('Could not load fields. Login and create a field first.')
        const data = await response.json()
        setFields(data)
        setSelectedFieldId(data[0]?.id || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load fields.')
      }
    }
    loadFields()
  }, [])

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(((prev: File[]) => [...prev, ...acceptedFiles]) as any)
    setAnalysisResult(null)
    setError(null)
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(((prev: File[]) => prev.filter((_file, i) => i !== index)) as any)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'video/*': ['.mp4', '.mov'],
      'application/pdf': ['.pdf'],
    },
    onDrop: handleDrop,
    multiple: true,
  } as any)

  const handleAnalyze = async () => {
    if (!selectedFieldId) {
      setError('Create and select a field before soil analysis.')
      return
    }
    if (selectedFiles.length === 0) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const results = await Promise.all(selectedFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('field_id', selectedFieldId)
        formData.append('file', file)

        const response = await fetch(`${API_BASE_URL}/soil/${endpointForType(analysisType)}`, {
          method: 'POST',
          headers: authHeaders(),
          body: formData,
        })

        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.detail || 'Soil analysis failed.')
        }
        return response.json()
      }))

      const latest = results[results.length - 1]
      const analysis = latest?.analysis_result || {}
      const cropNames = (latest?.recommendations || []).map((rec: any) => `Recommended crop: ${rec.crop_name}`)
      const recommendations = [
        ...(Array.isArray(analysis.recommendations) ? analysis.recommendations : []),
        ...cropNames,
      ]

      setAnalysisResult({
        soilType: analysis.soil_type || 'Unknown',
        pH: formatValue(analysis.ph_level),
        moisture: formatValue(analysis.moisture_content),
        nitrogen: formatValue(analysis.nitrogen_content),
        phosphorus: formatValue(analysis.phosphorus_content),
        potassium: formatValue(analysis.potassium_content),
        organicMatter: formatValue(analysis.organic_matter),
        recommendations: recommendations.length ? recommendations : ['Analysis completed. Check Crop Recommendations for next steps.'],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Soil analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Soil Analysis - KrishiAI</title>
      </Helmet>

      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Soil Analysis</h1>
          <p className="text-muted-foreground">Upload soil images, videos, or lab reports for AI-powered analysis</p>
        </div>

        {error && (
          <div className="glass-card flex items-start gap-3 border-red-500/30 bg-red-500/10">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="glass-card">
          <h2 className="text-lg font-semibold mb-4">Select Field</h2>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved fields found. Create a field in Land Management first.</p>
          ) : (
            <select value={selectedFieldId} onChange={(e) => setSelectedFieldId(e.target.value)} className="input max-w-md">
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.field_name} ({Number(field.field_size || 0).toFixed(2)} acres)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="glass-card">
          <h2 className="text-lg font-semibold mb-4">Select Analysis Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'image' as const, icon: ImageIcon, label: 'Image Analysis', desc: 'Upload soil photos' },
              { type: 'video' as const, icon: Video, label: 'Video Analysis', desc: 'Upload soil videos' },
              { type: 'lab' as const, icon: FileText, label: 'Lab Report', desc: 'Upload lab reports (PDF/image)' },
            ].map(({ type, icon: Icon, label, desc }) => (
              <button
                key={type}
                onClick={() => setAnalysisType(type)}
                className={`p-4 rounded-lg border-2 transition-all duration-300 text-left glass ${analysisType === type ? 'border-primary/50 bg-primary/10' : 'border hover:border-primary/50'}`}
              >
                <Icon className={`h-8 w-8 mb-2 ${analysisType === type ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">{label}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {!analysisResult && (
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4">Upload Files</h2>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 glass ${isDragActive ? 'border-primary/50 bg-primary/10' : 'border hover:border-primary/50'}`}
            >
              <input {...(getInputProps() as any)} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">{isDragActive ? 'Drop the files here...' : 'Drag & drop files here, or click to select'}</p>
              <p className="text-sm text-muted-foreground">Supports images, videos, and PDF files</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
                {selectedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 glass rounded-lg">
                    <div className="flex items-center space-x-3">
                      {file.type.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-primary" /> : file.type.startsWith('video/') ? <Video className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button onClick={() => removeFile(index)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors" aria-label="Remove file">
                      <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
                <button onClick={handleAnalyze} disabled={isAnalyzing || !selectedFieldId} className="btn btn-primary btn-md w-full mt-4 disabled:opacity-60">
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Soil'}
                </button>
              </div>
            )}
          </div>
        )}

        {analysisResult && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
              <button onClick={() => { setAnalysisResult(null); setSelectedFiles([]) }} className="btn btn-outline btn-sm">
                New Analysis
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card">
                <h3 className="text-lg font-semibold mb-4">Soil Properties</h3>
                <div className="space-y-4">
                  <Row label="Soil Type" value={analysisResult.soilType} />
                  <Row label="pH Level" value={analysisResult.pH} />
                  <Row label="Moisture Content" value={analysisResult.moisture} />
                  <Row label="Nitrogen (N)" value={analysisResult.nitrogen} />
                  <Row label="Phosphorus (P)" value={analysisResult.phosphorus} />
                  <Row label="Potassium (K)" value={analysisResult.potassium} />
                  <Row label="Organic Matter" value={analysisResult.organicMatter} last />
                </div>
              </div>

              <div className="glass-card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {analysisResult.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 glass rounded-lg border border-green-500/20">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                      <p className="text-sm text-muted-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const Row = ({ label, value, last = false }: { label: string; value: string | number; last?: boolean }) => (
  <div className={`flex justify-between items-center ${last ? '' : 'pb-3 border-b'}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
)

export default SoilAnalysisPage
