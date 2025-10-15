"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  fallbackSrc?: string
}

export function LogoImage({ 
  src, 
  alt, 
  width, 
  height, 
  className,
  priority = false,
  fallbackSrc = "/favicon.ico"
}: LogoImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError && fallbackSrc && imgSrc !== fallbackSrc) {
      setHasError(true)
      setImgSrc(fallbackSrc)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn("object-contain", hasError && "opacity-50")}
        priority={priority}
        onError={handleError}
        unoptimized={true} // Disable optimization for better compatibility
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">📷</span>
        </div>
      )}
    </div>
  )
}





