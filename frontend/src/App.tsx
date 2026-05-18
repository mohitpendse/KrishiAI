import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import LandManagementPage from './pages/LandManagementPage'
import CropRecommendationsPage from './pages/CropRecommendationsPage'
import MarketplacePage from './pages/MarketplacePage'
import SellCropPage from './pages/SellCropPage'
import FinancialManagementPage from './pages/FinancialManagementPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Helmet>
              <title>KrishiAI - Smart Farming Companion</title>
              <meta name="description" content="AI-Powered Farming Platform for Indian Farmers" />
            </Helmet>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes */}
            <Route path="/app" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="land-management" element={<LandManagementPage />} />
              <Route path="crop-recommendations" element={<CropRecommendationsPage />} />
              <Route path="marketplace" element={<MarketplacePage />} />
              <Route path="marketplace/sell" element={<SellCropPage />} />
              <Route path="financial" element={<FinancialManagementPage />} />
              {/* News page removed — news is displayed on the dashboard */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            
            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
