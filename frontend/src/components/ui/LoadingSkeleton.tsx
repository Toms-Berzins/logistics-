import React from 'react'
import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  animate?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  animate = true 
}) => {
  return (
    <div
      className={cn(
        'bg-gray-200 rounded',
        animate && 'animate-pulse',
        className
      )}
    />
  )
}

// Table skeleton for ActiveJobs
export const ActiveJobsTableSkeleton: React.FC<{ rows?: number }> = ({ 
  rows = 10 
}) => {
  return (
    <div className="space-y-4">
      {/* Search bar skeleton */}
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>
      
      {/* Table skeleton */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex bg-gray-50 border-b border-gray-200">
          <Skeleton className="h-12 w-12 m-3" />
          <Skeleton className="h-12 w-32 m-3" />
          <Skeleton className="h-12 w-40 m-3" />
          <Skeleton className="h-12 w-48 m-3" />
          <Skeleton className="h-12 w-48 m-3" />
          <Skeleton className="h-12 w-32 m-3" />
          <Skeleton className="h-12 w-24 m-3" />
          <Skeleton className="h-12 w-40 m-3" />
          <Skeleton className="h-12 w-24 m-3" />
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, index) => (
          <div 
            key={index} 
            className="flex border-b border-gray-200 last:border-b-0"
          >
            <Skeleton className="h-16 w-12 m-3" />
            <Skeleton className="h-16 w-32 m-3" />
            <Skeleton className="h-16 w-40 m-3" />
            <div className="space-y-2 m-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-2 m-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-16 w-32 m-3" />
            <Skeleton className="h-16 w-24 m-3" />
            <div className="space-y-2 m-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-2 m-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Map skeleton
export const DriverMapSkeleton: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* Map placeholder */}
      <Skeleton className="w-full h-full" />
      
      {/* Top controls */}
      <div className="absolute top-4 left-4 space-y-2">
        <Skeleton className="h-12 w-48 bg-white/80" />
      </div>
      
      <div className="absolute top-4 right-20 space-y-2">
        <Skeleton className="h-16 w-32 bg-white/80" />
      </div>
      
      {/* Bottom controls */}
      <div className="absolute bottom-4 left-4 space-y-2">
        <Skeleton className="h-8 w-24 bg-white/80" />
        <Skeleton className="h-8 w-24 bg-white/80" />
        <Skeleton className="h-8 w-28 bg-white/80" />
      </div>
      
      {/* Simulated driver markers */}
      <div className="absolute top-1/4 left-1/3">
        <Skeleton className="h-10 w-10 rounded-full bg-green-200" />
      </div>
      <div className="absolute top-1/2 right-1/3">
        <Skeleton className="h-10 w-10 rounded-full bg-blue-200" />
      </div>
      <div className="absolute bottom-1/3 left-1/2">
        <Skeleton className="h-10 w-10 rounded-full bg-yellow-200" />
      </div>
    </div>
  )
}

// Analytics skeleton
export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-6 bg-white border border-gray-200 rounded-lg">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <Skeleton className="h-6 w-28 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      
      {/* Data table */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex space-x-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Pricing page skeleton
export const PricingSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-64 mx-auto" />
        <Skeleton className="h-6 w-96 mx-auto" />
      </div>
      
      {/* Toggle */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
      
      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-8 bg-white border border-gray-200 rounded-lg">
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-12 w-32 mb-4" />
            <Skeleton className="h-4 w-full mb-6" />
            
            <div className="space-y-3 mb-8">
              {Array.from({ length: 5 }).map((_, featureIndex) => (
                <div key={featureIndex} className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
            
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Payment methods skeleton
export const PaymentMethodsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Payment methods list */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-20" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Generic card skeleton
export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton 
            key={index} 
            className={cn(
              'h-4',
              index === lines - 1 ? 'w-3/4' : 'w-full'
            )} 
          />
        ))}
      </div>
    </div>
  )
}

// Loading dots animation
export const LoadingDots: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ 
  size = 'md' 
}) => {
  const dotSize = size === 'sm' ? 'h-1 w-1' : size === 'lg' ? 'h-3 w-3' : 'h-2 w-2'
  
  return (
    <div className="flex space-x-1">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'bg-gray-400 rounded-full animate-bounce',
            dotSize
          )}
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  )
}