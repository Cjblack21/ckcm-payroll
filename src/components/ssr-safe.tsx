"use client"

import { useEffect, useState } from "react"

interface SSRSafeProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SSRSafe({ children, fallback = null }: SSRSafeProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook for checking if component is mounted
export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}











