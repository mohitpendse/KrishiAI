import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Search as SearchIcon,
  ShoppingCart,
  MapPin,
  Star as StarIcon,
  Calendar,
  Store,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getUserStorageKey } from '../utils/storage'

const LISTINGS_STORAGE_KEY = 'krishiai-marketplace-listings'
const CART_STORAGE_KEY = 'krishiai-marketplace-cart'

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

type CartItem = {
  listingId: number
  quantity: number
}

const readStoredListings = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getUserStorageKey(LISTINGS_STORAGE_KEY))
    return raw ? (JSON.parse(raw) as Listing[]) : []
  } catch {
    return []
  }
}

const readStoredCart = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getUserStorageKey(CART_STORAGE_KEY))
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

const MarketplacePage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('price-low')
  const [userListings, setUserListings] = useState<Listing[]>(() => readStoredListings())
  const [cart, setCart] = useState<CartItem[]>(() => readStoredCart())
  const [showCart, setShowCart] = useState(false)
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onStorage = () => setUserListings(readStoredListings())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(getUserStorageKey(CART_STORAGE_KEY), JSON.stringify(cart))
  }, [cart])

  const listings = userListings
  const categories = ['all', 'vegetables', 'grains', 'fruits', 'spices']

  const filteredListings: Listing[] = (() => {
    const filtered = listings.filter((listing) => {
      const matchesSearch = `${listing.cropName} ${listing.location} ${listing.farmer}`.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory
      return matchesSearch && matchesCategory
    })

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'rating':
          return b.rating - a.rating
        case 'newest':
          return new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime()
        default:
          return 0
      }
    })
  })()

  const cartLines = cart
    .map((item) => {
      const listing = listings.find((entry) => entry.id === item.listingId)
      return listing ? { ...item, listing, subtotal: item.quantity * listing.price } : null
    })
    .filter(Boolean) as Array<CartItem & { listing: Listing; subtotal: number }>

  const cartTotal = cartLines.reduce((total, item) => total + item.subtotal, 0)
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)

  const addToCart = (listing: Listing) => {
    setCheckoutComplete(false)
    const existing = cart.find((item) => item.listingId === listing.id)
    const nextCart = existing
      ? cart.map((item) =>
          item.listingId === listing.id
            ? { ...item, quantity: Math.min(item.quantity + 1, listing.quantity) }
            : item
        )
      : [...cart, { listingId: listing.id, quantity: 1 }]
    setCart(nextCart)
    setShowCart(true)
  }

  const updateCartQuantity = (listingId: number, nextQuantity: number) => {
    const listing = listings.find((entry) => entry.id === listingId)
    if (!listing) return
    if (nextQuantity <= 0) {
      setCart(cart.filter((item) => item.listingId !== listingId))
      return
    }
    setCart(
      cart.map((item) =>
        item.listingId === listingId
          ? { ...item, quantity: Math.min(nextQuantity, listing.quantity) }
          : item
      )
    )
  }

  const completeCheckout = () => {
    setCart([])
    setCheckoutComplete(true)
  }

  return (
    <>
      <Helmet>
        <title>Marketplace - KrishiAI</title>
      </Helmet>

      <div className="app-page">
        <div className="app-page-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="app-page-eyebrow">
                <Store className="h-3.5 w-3.5 text-emerald-300" />
                Direct farm trade
              </div>
              <h1 className="app-page-title">Marketplace</h1>
              <p className="app-page-subtitle">Buy fresh produce directly from farmers and list your own harvest.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn btn-outline btn-lg relative" onClick={() => setShowCart(true)}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Cart
                {cartCount > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </button>
              <button className="btn btn-primary btn-lg shadow-lg shadow-primary/30 hover-lift" onClick={() => navigate('/app/marketplace/sell')}>
                <Store className="h-4 w-4 mr-2" />
                Sell Your Crop
              </button>
            </div>
          </div>
        </div>

        {checkoutComplete && (
          <div className="app-panel border-primary/30 bg-primary/5">
            <p className="font-semibold text-primary">Order placed</p>
            <p className="text-sm text-muted-foreground">Your checkout is complete. The cart is now empty.</p>
          </div>
        )}

        <div className="app-panel">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
                placeholder="Search crops, sellers, or locations..."
              />
            </div>

            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`app-chip whitespace-nowrap ${selectedCategory === category ? 'app-chip-active' : ''}`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} className="input md:max-w-52">
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {filteredListings.length === 0 ? (
          <div className="app-panel p-12 text-center">
            <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="app-panel-text mb-2 text-xl font-semibold">No listings found</h3>
            <p className="app-panel-muted">Try adjusting your search or publish a new crop listing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="app-panel group overflow-hidden p-0">
                <div className="relative h-48 overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <img src={listing.image} alt={listing.cropName} className="h-full w-full object-cover" />
                  <div className="absolute right-3 top-3 rounded-full border border-white/30 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-900 backdrop-blur dark:bg-slate-950/80 dark:text-white">
                    {listing.quality}
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
                        {listing.cropName}
                      </h3>
                      <p className="text-sm text-muted-foreground">By {listing.farmer}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{listing.rating}</span>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{listing.location}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Harvested: {listing.harvestDate}</span>
                  </div>

                  <div className="border-t border-border/60 pt-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-2xl font-bold text-primary">₹{listing.price}/kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Available</p>
                        <p className="text-lg font-semibold">{listing.quantity} kg</p>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm w-full" onClick={() => addToCart(listing)}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-background p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Cart</h2>
                <p className="text-sm text-muted-foreground">{cartCount} kg selected</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCart(false)} aria-label="Close cart">
                <X className="h-4 w-4" />
              </button>
            </div>

            {cartLines.length === 0 ? (
              <div className="app-panel p-8 text-center">
                <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">Your cart is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">Add crops from the marketplace to buy them here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartLines.map((item) => (
                  <div key={item.listingId} className="app-panel p-4">
                    <div className="flex gap-3">
                      <img src={item.listing.image} alt={item.listing.cropName} className="h-16 w-16 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{item.listing.cropName}</p>
                            <p className="text-sm text-muted-foreground">₹{item.listing.price}/kg</p>
                          </div>
                          <button className="text-muted-foreground hover:text-red-500" onClick={() => updateCartQuantity(item.listingId, 0)} aria-label="Remove item">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <input
                            className="input h-9 w-24"
                            type="number"
                            min="1"
                            max={item.listing.quantity}
                            value={item.quantity}
                            onChange={(event: any) => updateCartQuantity(item.listingId, Number(event.target.value))}
                            aria-label={`${item.listing.cropName} quantity`}
                          />
                          <p className="font-semibold">₹{item.subtotal.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="app-panel sticky bottom-0 space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <button className="btn btn-primary btn-lg w-full" onClick={completeCheckout}>
                    Buy Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default MarketplacePage
