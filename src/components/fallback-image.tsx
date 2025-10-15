"use client"

import Image from "next/image"
import { useState } from "react"

interface FallbackImageProps {
  src: string
  fallbackSrc: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  priority?: boolean
}

export function FallbackImage({ 
  src, 
  fallbackSrc, 
  alt, 
  width, 
  height, 
  fill, 
  className, 
  priority 
}: FallbackImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError) {
      setCurrentSrc(fallbackSrc)
      setHasError(true)
    }
  }

  const handleLoad = () => {
    // Image loaded successfully
  }

  return (
    <Image
      src={currentSrc}
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
