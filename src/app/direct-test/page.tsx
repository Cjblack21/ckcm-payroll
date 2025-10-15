"use client"

import { useState } from "react"

export default function DirectTest() {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})

  const testImage = async (src: string, name: string) => {
    try {
      const response = await fetch(src, { method: 'HEAD' })
      const success = response.ok
      setTestResults(prev => ({ ...prev, [name]: success }))
      return success
    } catch (error) {
      setTestResults(prev => ({ ...prev, [name]: false }))
      return false
    }
  }

  const testAllImages = async () => {
    const images = [
      { src: '/ckcm.png', name: 'CKCM PNG' },
      { src: '/pmslogo.jpg', name: 'PMS JPG' },
      { src: '/test-logo.svg', name: 'Test Logo SVG' },
      { src: '/test-bg.svg', name: 'Test BG SVG' },
    ]

    for (const image of images) {
      await testImage(image.src, image.name)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Direct Image Access Test</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testAllImages}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Test All Images
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { src: '/ckcm.png', name: 'CKCM PNG' },
            { src: '/pmslogo.jpg', name: 'PMS JPG' },
            { src: '/test-logo.svg', name: 'Test Logo SVG' },
            { src: '/test-bg.svg', name: 'Test BG SVG' },
          ].map((image) => (
            <div key={image.name} className="border p-4 rounded">
              <h3 className="font-semibold mb-2">{image.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span>Status:</span>
                  {testResults[image.name] === undefined ? (
                    <span className="text-gray-500">Not tested</span>
                  ) : testResults[image.name] ? (
                    <span className="text-green-600">✅ Available</span>
                  ) : (
                    <span className="text-red-600">❌ Not found</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>URL:</span>
                  <a 
                    href={image.src} 
                    target="_blank" 
                    className="text-blue-500 hover:underline text-sm"
                  >
                    {image.src}
                  </a>
                </div>
                <div className="mt-2">
                  <img 
                    src={image.src} 
                    alt={image.name}
                    className="w-full h-24 object-contain border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const nextEl = e.currentTarget.nextElementSibling as HTMLElement
                      if (nextEl) nextEl.style.display = 'block'
                    }}
                  />
                  <div style={{display: 'none'}} className="text-red-500 text-center py-4">
                    ❌ Image failed to load
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Network Analysis</h2>
        <p className="text-sm text-gray-600">
          Open browser Developer Tools (F12) → Network tab → Reload page to see detailed network requests
        </p>
      </div>
    </div>
  )
}











