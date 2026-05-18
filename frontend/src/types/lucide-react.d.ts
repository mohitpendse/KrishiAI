declare module 'lucide-react' {
  import * as React from 'react'
  
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number
    absoluteStrokeWidth?: boolean
  }
  
  export type LucideIcon = React.ComponentType<LucideProps>
  
  // Export all icons
  export const Upload: LucideIcon
  export const Image: LucideIcon
  export const Video: LucideIcon
  export const CheckCircle: LucideIcon
  export const Check: LucideIcon
  export const AlertCircle: LucideIcon
  export const Search: LucideIcon
  export const Filter: LucideIcon
  export const Star: LucideIcon
  export const Mail: LucideIcon
  export const RefreshCcw: LucideIcon
  export const RefreshCw: LucideIcon
  export const Bot: LucideIcon
  
  // Add other icons that might be used
  export const AlertTriangle: LucideIcon
  export const Store: LucideIcon
  export const Home: LucideIcon
  export const Menu: LucideIcon
  export const X: LucideIcon
  export const Bell: LucideIcon
  export const Settings: LucideIcon
  export const LogOut: LucideIcon
  export const User: LucideIcon
  export const Pencil: LucideIcon
  export const Wheat: LucideIcon
  export const Sun: LucideIcon
  export const Moon: LucideIcon
  export const Globe: LucideIcon
  export const Sprout: LucideIcon
  export const FileText: LucideIcon
  export const ShoppingCart: LucideIcon
  export const MapPin: LucideIcon
  export const Calendar: LucideIcon
  export const Eye: LucideIcon
  export const EyeOff: LucideIcon
  export const Phone: LucideIcon
  export const Lock: LucideIcon
  export const DollarSign: LucideIcon
  export const TrendingUp: LucideIcon
  export const TrendingDown: LucideIcon
}
