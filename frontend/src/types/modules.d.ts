// Temporary ambient module declarations to unblock TypeScript when node_modules are missing.
// Replace with real type packages by installing dependencies.

declare module 'react' {
  export type ReactNode = any
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => JSX.Element | null
  export type Context<T = any> = any
  export class Component<P = {}, S = {}> {
    constructor(props?: P)
    setState(state: Partial<S> | ((prevState: S) => Partial<S>)): void
    forceUpdate(): void
    render(): ReactNode
    context: any
    props: P
    state: S
    refs: any
  }
  export function createContext<T = any>(defaultValue?: T): Context<T>
  export function useContext<T = any>(context: Context<T>): T
  export function useState<S = any>(initialState: S | (() => S)): [S, (value: S) => void]
  export function useEffect(effect: (...args: any[]) => any, deps?: any[]): void
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T
  export const StrictMode: any
  const React: {
    useState: typeof useState
    useEffect: typeof useEffect
    useCallback: typeof useCallback
    createContext: typeof createContext
    useContext: typeof useContext
    StrictMode: typeof StrictMode
    Component: typeof Component
  }
  export default React
  // Also expose a React namespace for React.ReactNode/React.FC references
  export namespace React {
    type ReactNode = any
    type FC<P = {}> = (props: P & { children?: any }) => JSX.Element | null
    class Component<P = {}, S = {}> {
      constructor(props?: P)
      setState(state: Partial<S> | ((prevState: S) => Partial<S>)): void
      forceUpdate(): void
      render(): ReactNode
      context: any
      props: P
      state: S
      refs: any
    }
  }
}

declare module 'react-dom/client' {
  const ReactDOMClient: any
  export default ReactDOMClient
}
declare module 'react/jsx-runtime' {
  const jsxRuntime: any
  export default jsxRuntime
}
declare module 'react-helmet-async' {
  import { Component } from 'react'
  
  export interface HelmetProps {
    children?: any
    [key: string]: any
  }
  
  export class Helmet extends Component<HelmetProps> {}
  export class HelmetProvider extends Component<{ children?: any }> {}
}
declare module 'react-query' {
  export class QueryClient {
    constructor(...args: any[])
  }
  export const QueryClientProvider: any
  export function useQuery(...args: any[]): any
  export function useMutation(...args: any[]): any
  export function useQueryClient(...args: any[]): any
}
declare module 'react-router-dom' {
  export const BrowserRouter: any
  export const Link: any
  export const Navigate: any
  export const NavLink: any
  export const Outlet: any
  export const Routes: any
  export const Route: any
  export function useNavigate(): any
}
declare module 'lucide-react' {
  export const ArrowRight: any
  export const Leaf: any
  export const Sprout: any
  export const Brain: any
  export const TrendingUp: any
  export const TrendingDown: any
  export const Users: any
  export const Shield: any
  export const TestTube: any
  export const Store: any
  export const Bot: any
  export const Home: any
  export const ArrowLeft: any
  export const Menu: any
  export const X: any
  export const Check: any
  export const Bell: any
  export const Settings: any
  export const LogOut: any
  export const User: any
  export const Pencil: any
  export const Wheat: any
  export const Sun: any
  export const Moon: any
  export const Globe: any
  export const MapPin: any
  export const ShoppingCart: any
  export const DollarSign: any
  export const FileText: any
  export const Newspaper: any
  export const Droplets: any
  export const AlertTriangle: any
  export const BarChart3: any
  export const Calendar: any
  export const Phone: any
  export const Eye: any
  export const EyeOff: any
  export const Lock: any
}
declare module 'react-hook-form' {
  export function useForm<T = any>(...args: any[]): any
}
declare module 'react-hot-toast' {
  const toast: any
  export const Toaster: any
  export default toast
}
declare module 'axios' {
  const axios: any
  export default axios
}
declare module 'i18next' {
  const i18n: any
  export default i18n
}
declare module 'react-i18next' {
  export const initReactI18next: any
}
declare module 'i18next-browser-languagedetector' {
  const LanguageDetector: any
  export default LanguageDetector
}

// Vite env shim
interface ImportMetaEnv {
  VITE_API_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global React namespace for type references like React.FC, React.ReactNode
declare namespace React {
  type ReactNode = any
  type FC<P = {}> = (props: P & { children?: any }) => any
}

// Image module declarations
declare module '*.png' {
  const value: string
  export default value
}

declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.jpeg' {
  const value: string
  export default value
}

declare module '*.svg' {
  const value: string
  export default value
}

declare module '*.gif' {
  const value: string
  export default value
}

declare module '*.webp' {
  const value: string
  export default value
}
