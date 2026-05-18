import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '../contexts/AuthContext'

const Layout: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen glass-bg transition-all duration-300">
      <Navbar />
      <div className="flex min-w-0">
        <Sidebar />
        <main className="flex-1 min-w-0 w-full p-4 sm:p-6 transition-all duration-300 md:ml-64">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
