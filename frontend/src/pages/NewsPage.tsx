import React from 'react'
import { Helmet } from 'react-helmet-async'

const NewsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>News & Updates - KrishiAI</title>
      </Helmet>
      <div>
        <h1 className="text-2xl font-bold mb-4">News & Updates</h1>
        <p className="text-gray-600">News and updates features will be implemented here.</p>
      </div>
    </>
  )
}

export default NewsPage
