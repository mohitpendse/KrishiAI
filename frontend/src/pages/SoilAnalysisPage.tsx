import * as React from 'react'
const useState = React.useState
const useCallback = (React as any).useCallback
import { Helmet } from 'react-helmet-async'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon, FileText, Video, X, CheckCircle, AlertCircle } from 'lucide-react'
import { CardSkeleton } from '../components/LoadingSkeleton'

const SoilAnalysisPage = () => {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    const updater = (prev: File[]) => {
      const newFiles: File[] = [...prev, ...acceptedFiles]
      return newFiles
    }
    setSelectedFiles(updater as any)
  }, [])
  
  const removeFile = useCallback((index: number) => {
    const updater = (prev: File[]) => {
      const filtered: File[] = prev.filter((_file: File, i: number) => i !== index)
      return filtered
    }
    setSelectedFiles(updater as any)
  }, [])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [analysisType, setAnalysisType] = useState<'image' | 'video' | 'lab'>('image')

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
    if (selectedFiles.length === 0) return

    setIsAnalyzing(true)
    // Simulate API call
    setTimeout(() => {
      setAnalysisResult({
        soilType: 'Clay Loam',
        pH: 6.8,
        moisture: 45.2,
        nitrogen: 0.15,
        phosphorus: 0.12,
        potassium: 0.18,
        organicMatter: 2.5,
        recommendations: [
          'Soil pH is optimal for most crops',
          'Consider adding organic compost to improve fertility',
          'Moisture content is adequate',
        ],
      })
      setIsAnalyzing(false)
    }, 2000)
  }

  if (isAnalyzing) {
    return (
      <>
        <Helmet>
          <title>Analyzing Soil - KrishiAI</title>
        </Helmet>
        <div className="space-y-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">Analyzing your soil sample...</h3>
            <p className="text-muted-foreground">This may take a few moments</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Soil Analysis - KrishiAI</title>
      </Helmet>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Soil Analysis</h1>
          <p className="text-muted-foreground">Upload soil images, videos, or lab reports for AI-powered analysis</p>
        </div>

        {/* Analysis Type Selection */}
        <div className="glass-card">
          <h2 className="text-lg font-semibold mb-4">Select Analysis Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'image' as const, icon: ImageIcon, label: 'Image Analysis', desc: 'Upload soil photos' },
              { type: 'video' as const, icon: Video, label: 'Video Analysis', desc: 'Upload soil videos' },
              { type: 'lab' as const, icon: FileText, label: 'Lab Report', desc: 'Upload lab reports (PDF)' },
            ].map(({ type, icon: Icon, label, desc }) => (
              <button
                key={type}
                onClick={() => setAnalysisType(type)}
                className={`p-4 rounded-lg border-2 transition-all duration-300 text-left glass ${
                  analysisType === type
                    ? 'border-primary/50 bg-primary/10'
                    : 'border hover:border-primary/50'
                }`}
              >
                <Icon className={`h-8 w-8 mb-2 ${analysisType === type ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">{label}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* File Upload */}
        {!analysisResult && (
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4">Upload Files</h2>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 glass ${
                isDragActive
                  ? 'border-primary/50 bg-primary/10'
                  : 'border hover:border-primary/50'
              }`}
            >
              <input {...(getInputProps() as any)} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-primary font-medium">Drop the files here...</p>
              ) : (
                <>
                  <p className="text-muted-foreground mb-2">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports images, videos, and PDF files
                  </p>
                </>
              )}
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 glass rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-5 w-5 text-primary" />
                      ) : file.type.startsWith('video/') ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAnalyze}
                  className="btn btn-primary btn-md w-full mt-4"
                >
                  Analyze Soil
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
              <button
                onClick={() => {
                  setAnalysisResult(null)
                  setSelectedFiles([])
                }}
                className="btn btn-outline btn-sm"
              >
                New Analysis
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Soil Properties */}
              <div className="glass-card">
                <h3 className="text-lg font-semibold mb-4">Soil Properties</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-muted-foreground">Soil Type</span>
                    <span className="font-semibold">{analysisResult.soilType}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-muted-foreground">pH Level</span>
                    <span className="font-semibold">{analysisResult.pH}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-muted-foreground">Moisture Content</span>
                    <span className="font-semibold">{analysisResult.moisture}%</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-muted-foreground">Nitrogen (N)</span>
                    <span className="font-semibold">{analysisResult.nitrogen}%</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-muted-foreground">Phosphorus (P)</span>
                    <span className="font-semibold">{analysisResult.phosphorus}%</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-muted-foreground">Potassium (K)</span>
                    <span className="font-semibold">{analysisResult.potassium}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Organic Matter</span>
                    <span className="font-semibold">{analysisResult.organicMatter}%</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="glass-card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {analysisResult.recommendations.map((rec: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 glass rounded-lg border border-green-500/20"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
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

export default SoilAnalysisPage
