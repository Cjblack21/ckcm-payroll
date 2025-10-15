"use client"

import { useState } from "react"

interface EmergencyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
}

export function EmergencyImage({ src, alt, width = 120, height = 48, className }: EmergencyImageProps) {
  const [useFallback, setUseFallback] = useState(false)

  if (useFallback) {
    return (
      <div className={`flex items-center justify-center bg-blue-600 text-white rounded-lg ${className}`} 
           style={{ width, height }}>
        <div className="text-center">
          <div className="text-lg font-bold">CKCM</div>
          <div className="text-xs opacity-80">LOGO</div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setUseFallback(true)}
      onLoad={() => console.log(`Image loaded: ${src}`)}
    />
  )
}











