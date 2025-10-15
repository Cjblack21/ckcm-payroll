"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

export function DebugImageTest() {
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    const tests = [
      {
        name: "CKCM PNG Test",
        src: "/ckcm.png"
      },
      {
        name: "PMS JPG Test", 
        src: "/pmslogo.jpg"
      },
      {
        name: "Favicon Test",
        src: "/favicon.ico"
      }
    ]

    tests.forEach(test => {
      const img = new window.Image()
      
      img.onload = () => {
        setTestResults(prev => [...prev, `✅ ${test.name}: Loaded successfully (${img.width}x${img.height})`])
      }
      
      img.onerror = () => {
        setTestResults(prev => [...prev, `❌ ${test.name}: Failed to load`])
      }
      
      img.src = test.src
    })
  }, [])

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Image Loading Debug Test</h3>
      
      <div className="space-y-4">
        {/* Test Results */}
        <div className="bg-gray-100 p-3 rounded">
          <h4 className="font-semibold mb-2">Test Results:</h4>
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono">{result}</div>
            ))}
          </div>
        </div>

        {/* Direct img tag test */}
        <div className="bg-gray-100 p-3 rounded">
          <h4 className="font-semibold mb-2">Direct img tag test:</h4>
          <div className="flex space-x-4">
            <div className="text-center">
              <img 
                src="/ckcm.png" 
                alt="CKCM Direct" 
                className="w-16 h-16 object-contain border"
                onLoad={() => console.log("CKCM direct img loaded")}
                onError={() => console.log("CKCM direct img failed")}
              />
              <p className="text-xs mt-1">CKCM Direct</p>
            </div>
            <div className="text-center">
              <img 
                src="/pmslogo.jpg" 
                alt="PMS Direct" 
                className="w-16 h-16 object-contain border"
                onLoad={() => console.log("PMS direct img loaded")}
                onError={() => console.log("PMS direct img failed")}
              />
              <p className="text-xs mt-1">PMS Direct</p>
            </div>
          </div>
        </div>

        {/* Next.js Image test */}
        <div className="bg-gray-100 p-3 rounded">
          <h4 className="font-semibold mb-2">Next.js Image test:</h4>
          <div className="flex space-x-4">
            <div className="text-center">
              <Image 
                src="/ckcm.png" 
                alt="CKCM Next.js" 
                width={64}
                height={64}
                className="w-16 h-16 object-contain border"
                unoptimized
              />
              <p className="text-xs mt-1">CKCM Next.js</p>
            </div>
            <div className="text-center">
              <Image 
                src="/pmslogo.jpg" 
                alt="PMS Next.js" 
                width={64}
                height={64}
                className="w-16 h-16 object-contain border"
                unoptimized
              />
              <p className="text-xs mt-1">PMS Next.js</p>
            </div>
          </div>
        </div>

        {/* File size info */}
        <div className="bg-gray-100 p-3 rounded">
          <h4 className="font-semibold mb-2">File Information:</h4>
          <div className="text-sm space-y-1">
            <div>CKCM PNG: ~4.4MB (very large)</div>
            <div>PMS JPG: ~17KB (normal size)</div>
            <div>Favicon: ~4.4MB (very large - same as CKCM?)</div>
          </div>
        </div>
      </div>
    </div>
  )
}





