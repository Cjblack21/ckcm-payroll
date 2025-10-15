"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface UltraImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  priority?: boolean
}

export function UltraImage({ 
  src, 
  alt, 
  width, 
  height, 
  fill, 
  className, 
  priority 
}: UltraImageProps) {
  const [imageSrc, setImageSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Test if image exists by creating a new Image object
    const testImage = new window.Image()
    
    testImage.onload = () => {
      setIsLoading(false)
      setHasError(false)
    }
    
    testImage.onerror = () => {
      setIsLoading(false)
      setHasError(true)
    }
    
    testImage.src = src
  }, [src])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
        <div className="text-center">
          <div className="text-gray-500 text-sm">📷</div>
          <div className="text-gray-500 text-xs mt-1">Image not found</div>
        </div>
      </div>
    )
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      className={className}
      priority={priority}
    />
  )
}











