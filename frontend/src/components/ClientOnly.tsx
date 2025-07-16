'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Loading } from './ui'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
  showLoading?: boolean
  loadingText?: string
}

export default function ClientOnly({ 
  children, 
  fallback = null, 
  showLoading = false,
  loadingText = 'Loading...'
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    if (showLoading) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loading text={loadingText} />
        </div>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}