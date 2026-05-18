import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Upload, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getUserStorageKey } from '../utils/storage'

const LISTINGS_STORAGE_KEY = 'krishiai-marketplace-listings'

type Listing = {
  id: number
  cropName: string
  category: string
  farmer: string
  location: string
  price: number
  quantity: number
  quality: string
  rating: number
  image: string
  harvestDate: string
  description: string
}

const readListings = () => {
  try {
    const raw = window.localStorage.getItem(getUserStorageKey(LISTINGS_STORAGE_KEY))
    return raw ? (JSON.parse(raw) as Listing[]) : []
  } catch {
    return []
  }
}

const SellCropPage = () => {
  const navigate = useNavigate()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cropName, setCropName] = useState('')
  const [category, setCategory] = useState('grains')
  const [price, setPrice] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [quality, setQuality] = useState('Grade A')
  const [harvestDate, setHarvestDate] = useState<string>('')
  const [farmer, setFarmer] = useState('My Farm')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const onSelectFile = (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onSubmit = (e: any) => {
    e.preventDefault()

    if (!imagePreview) {
      setError('Upload a crop photo before publishing.')
      return
    }

    const nextListing: Listing = {
      id: Date.now(),
      cropName: cropName.trim(),
      category,
      farmer: farmer.trim() || 'My Farm',
      location: location.trim() || 'Local farm',
      price: Number(price),
      quantity: Number(quantity),
      quality,
      rating: 5,
      image: imagePreview,
      harvestDate,
      description: description.trim() || `${quality} ${cropName.trim()} available for direct purchase.`,
    }

    const nextListings = [nextListing, ...readListings()]
    window.localStorage.setItem(getUserStorageKey(LISTINGS_STORAGE_KEY), JSON.stringify(nextListings))
    window.dispatchEvent(new CustomEvent('krishiai:data-updated', { detail: { source: 'marketplace' } }))
    navigate('/app/marketplace')
  }

  return (
    <>
      <Helmet>
        <title>Sell Your Crop - KrishiAI</title>
      </Helmet>

      <div className="app-page">
        <div className="app-page-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button className="mb-4 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => navigate('/app/marketplace')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to marketplace
              </button>
              <h1 className="app-page-title">Sell Your Crop</h1>
              <p className="app-page-subtitle">Upload a photo, add crop details, and publish the listing for buyers.</p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="app-panel grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="label mb-1">Crop Name</label>
              <input className="input" value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="e.g., Wheat" required />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label mb-1">Seller Name</label>
                <input className="input" value={farmer} onChange={(e) => setFarmer(e.target.value)} placeholder="Farm or farmer name" />
              </div>
              <div>
                <label className="label mb-1">Location</label>
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Nashik" required />
              </div>
            </div>

            <div>
              <label className="label mb-1">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="grains">Grains</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="spices">Spices</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-1">Price (₹/kg)</label>
                <input className="input" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <div>
                <label className="label mb-1">Quantity (kg)</label>
                <input className="input" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-1">Quality</label>
                <select className="input" value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option>Premium</option>
                  <option>Grade A</option>
                  <option>Grade B</option>
                </select>
              </div>
              <div>
                <label className="label mb-1">Harvested On</label>
                <input className="input" type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label mb-1">Details</label>
              <textarea
                className="input min-h-[112px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe freshness, farming method, packaging, or delivery notes."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label mb-1">Upload Photo</label>
              <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted">
                <Upload className="mr-2 h-4 w-4" />
                Choose crop image
                <input className="sr-only" type="file" accept="image/*" onChange={onSelectFile} />
              </label>
            </div>

            <div className="flex h-72 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {imagePreview ? (
                <img src={imagePreview} alt="Crop preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm text-muted-foreground">Image preview</span>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-300/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" className="btn btn-outline flex-1" onClick={() => navigate('/app/marketplace')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1">
                <Check className="mr-2 h-4 w-4" />
                Publish Listing
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}

export default SellCropPage
