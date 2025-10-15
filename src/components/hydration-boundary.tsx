"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface HydrationBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function HydrationBoundary({ children, fallback = null }: HydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Alternative approach using dynamic imports
export function DynamicComponent<T extends Record<string, any>>({
  component: Component,
  fallback = null,
  ...props
}: {
  component: React.ComponentType<T>
  fallback?: React.ReactNode
} & T) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <>{fallback}</>
  }

  return <Component {...(props as any)} />
}











