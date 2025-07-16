'use client'

import React from 'react'
import { cn } from '../../lib/utils'
import { Button, Badge } from '../ui'

interface MobileNavigationProps {
  activeTab: 'map' | 'drivers' | 'routes' | 'settings'
  onTabChange: (tab: 'map' | 'drivers' | 'routes' | 'settings') => void
  driverCount?: number
  className?: string
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab,
  onTabChange,
  driverCount = 0,
  className
}) => {

  const tabs = [
    {
      id: 'map' as const,
      label: 'Map',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      badge: null,
    },
    {
      id: 'drivers' as const,
      label: 'Drivers',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: driverCount > 0 ? (
        <Badge variant="info" size="sm">
          {driverCount}
        </Badge>
      ) : null,
    },
    {
      id: 'routes' as const,
      label: 'Routes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      badge: null,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      badge: null,
    },
  ]


  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50',
      'bg-white border-t border-neutral-200',
      'safe-area-inset-bottom',
      'md:hidden', // Hide on desktop
      className
    )}>
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'h-full rounded-none flex flex-col items-center justify-center gap-1 p-2',
              'touch-target',
              'transition-colors duration-200',
              activeTab === tab.id
                ? 'text-primary-600 bg-primary-50'
                : 'text-neutral-600 hover:text-primary-600 hover:bg-neutral-50'
            )}
          >
            <div className="relative">
              {tab.icon}
              {tab.badge && (
                <div className="absolute -top-2 -right-2">
                  {tab.badge}
                </div>
              )}
            </div>
            <span className="text-xs font-medium">
              {tab.label}
            </span>
          </Button>
        ))}
      </div>
    </nav>
  )
}

export const MobileHeader: React.FC<{
  title: string
  subtitle?: string
  rightAction?: React.ReactNode
  leftAction?: React.ReactNode
  className?: string
}> = ({ title, subtitle, rightAction, leftAction, className }) => (
  <header className={cn(
    'bg-white border-b border-neutral-200',
    'px-4 py-3 flex items-center justify-between',
    'safe-area-inset-top',
    'md:hidden', // Hide on desktop
    className
  )}>
    <div className="flex items-center gap-3">
      {leftAction}
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-neutral-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {rightAction}
  </header>
)

export default MobileNavigation