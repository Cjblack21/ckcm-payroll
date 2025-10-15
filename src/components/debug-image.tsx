"use client"

import Image from "next/image"
import { useState } from "react"

interface DebugImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  priority?: boolean
}

export function DebugImage({ 
  src, 
  alt, 
  width, 
  height, 
  fill, 
  className, 
  priority 
}: DebugImageProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`Image failed to load: ${src}`, e)
    setImageError(true)
  }

  const handleLoad = () => {
    console.log(`Image loaded successfully: ${src}`)
    setImageLoaded(true)
  }

  if (imageError) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      className={className}
      priority={priority}
      onError={handleError}
      onLoad={handleLoad}
    />
  )
}











