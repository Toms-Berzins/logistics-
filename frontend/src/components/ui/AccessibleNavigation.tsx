/**
 * Accessible navigation components for logistics platform
 * WCAG 2.1 AA compliant with keyboard navigation and screen reader support
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { RovingTabindex } from '@/lib/accessibility/focus-management';
import { announceToLiveRegion } from '@/lib/accessibility/live-regions';
import { LOGISTICS_ARIA_LABELS } from '@/lib/accessibility';

// Navigation item interface
export interface NavigationItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
  children?: NavigationItem[];
  external?: boolean;
}

// Main navigation component
export interface MainNavigationProps {
  items: NavigationItem[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'pills' | 'underline';
  showIcons?: boolean;
  collapsible?: boolean;
}

export function MainNavigation({
  items,
  className = '',
  orientation = 'horizontal',
  variant = 'default',
  showIcons = true,
  collapsible = false,
}: MainNavigationProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const rovingTabindexRef = useRef<RovingTabindex | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Set up roving tabindex for keyboard navigation
  useEffect(() => {
    if (!navRef.current) return;

    rovingTabindexRef.current = new RovingTabindex(navRef.current, {
      selector: 'a[href], button',
      orientation: orientation === 'horizontal' ? 'horizontal' : 'vertical',
      wrap: true,
    });

    return () => {
      if (rovingTabindexRef.current) {
        rovingTabindexRef.current.deactivate();
      }
    };
  }, [orientation]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    
    announceToLiveRegion(
      `Navigation ${newState ? 'collapsed' : 'expanded'}`,
      { priority: 'polite', category: 'system' }
    );
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'pills':
        return 'rounded-md px-3 py-2';
      case 'underline':
        return 'border-b-2 border-transparent px-1 py-2';
      default:
        return 'px-3 py-2';
    }
  };

  const getActiveClasses = (item: NavigationItem) => {
    const isActive = item.href && pathname === item.href;
    
    if (!isActive) return '';
    
    switch (variant) {
      case 'pills':
        return 'bg-blue-100 text-blue-700';
      case 'underline':
        return 'border-blue-500 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const renderNavigationItem = (item: NavigationItem, index: number) => {
    const isActive = item.href && pathname === item.href;
    const hasChildren = item.children && item.children.length > 0;
    
    const baseClasses = `
      relative flex items-center gap-2 text-sm font-medium transition-colors
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${getVariantClasses()}
      ${isActive ? getActiveClasses(item) : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}
    `;

    const content = (
      <>
        {showIcons && item.icon && (
          <item.icon className="h-4 w-4 flex-shrink-0" />
        )}
        <span>{item.label}</span>
        {item.badge && (
          <span className="
            ml-auto flex-shrink-0 rounded-full bg-blue-600 text-white 
            text-xs px-2 py-0.5 min-w-[1.25rem] text-center
          ">
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
        )}
      </>
    );

    if (item.href) {
      return (
        <Link
          key={index}
          href={item.href}
          className={baseClasses}
          aria-current={isActive ? 'page' : undefined}
          aria-disabled={item.disabled}
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
        >
          {content}
        </Link>
      );
    }

    if (item.onClick) {
      return (
        <button
          key={index}
          onClick={item.onClick}
          disabled={item.disabled}
          className={baseClasses}
          type="button"
        >
          {content}
        </button>
      );
    }

    return (
      <div key={index} className={baseClasses.replace('cursor-pointer', '')}>
        {content}
      </div>
    );
  };

  return (
    <nav
      ref={navRef}
      className={`${className}`}
      role="navigation"
      aria-label={LOGISTICS_ARIA_LABELS.MAIN_NAVIGATION}
    >
      {collapsible && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          <button
            onClick={toggleCollapse}
            className="
              p-2 text-gray-400 hover:text-gray-600 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              rounded-md
            "
            aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <Bars3Icon className="h-5 w-5" />
            ) : (
              <XMarkIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      )}

      <div
        className={`
          ${orientation === 'horizontal' ? 'flex space-x-1' : 'space-y-1'}
          ${collapsible && isCollapsed ? 'hidden' : ''}
        `}
      >
        {items.map(renderNavigationItem)}
      </div>
    </nav>
  );
}

// Breadcrumb navigation component
export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  maxItems?: number;
}

export function Breadcrumb({
  items,
  className = '',
  separator = <ChevronRightIcon className="h-4 w-4 text-gray-400" />,
  maxItems = 4,
}: BreadcrumbProps) {
  // Truncate items if necessary
  const displayItems = items.length > maxItems 
    ? [
        items[0],
        { label: '...', href: undefined },
        ...items.slice(-(maxItems - 2)),
      ]
    : items;

  return (
    <nav
      className={`flex ${className}`}
      role="navigation"
      aria-label={LOGISTICS_ARIA_LABELS.BREADCRUMB}
    >
      <ol className="flex items-center space-x-2">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isTruncated = item.label === '...';

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2" aria-hidden="true">
                  {separator}
                </span>
              )}
              
              {isTruncated ? (
                <span className="text-gray-500 text-sm">...</span>
              ) : isLast || !item.href ? (
                <span
                  className={`
                    text-sm font-medium
                    ${isLast ? 'text-gray-900' : 'text-gray-500'}
                  `}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="
                    text-sm font-medium text-gray-500 hover:text-gray-700
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    rounded-md px-1 py-0.5
                  "
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Tab navigation component
export interface TabItem {
  id: string;
  label: string;
  content?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  showContent?: boolean;
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'underline',
  showContent = true,
}: TabNavigationProps) {
  const tabListRef = useRef<HTMLDivElement>(null);
  const rovingTabindexRef = useRef<RovingTabindex | null>(null);

  // Set up roving tabindex for keyboard navigation
  useEffect(() => {
    if (!tabListRef.current) return;

    rovingTabindexRef.current = new RovingTabindex(tabListRef.current, {
      selector: 'button[role="tab"]',
      orientation: 'horizontal',
      wrap: true,
    });

    return () => {
      if (rovingTabindexRef.current) {
        rovingTabindexRef.current.deactivate();
      }
    };
  }, []);

  const handleTabClick = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    
    onTabChange(tabId);
    
    // Announce tab change
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      announceToLiveRegion(
        `${tab.label} tab selected`,
        { priority: 'polite', category: 'system' }
      );
    }
  };

  const handleTabKeyDown = (event: React.KeyboardEvent, tabId: string) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleTabClick(tabId);
        break;
    }
  };

  const getTabClasses = (tab: TabItem) => {
    const isActive = tab.id === activeTab;
    
    const baseClasses = `
      relative flex items-center gap-2 px-4 py-2 text-sm font-medium
      transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    switch (variant) {
      case 'pills':
        return `${baseClasses} rounded-md ${
          isActive 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
        }`;
      
      case 'underline':
        return `${baseClasses} border-b-2 ${
          isActive 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`;
      
      default:
        return `${baseClasses} ${
          isActive 
            ? 'bg-white text-gray-900 border border-gray-200 border-b-white' 
            : 'text-gray-500 hover:text-gray-700'
        }`;
    }
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        className={`
          flex border-b border-gray-200
          ${variant === 'pills' ? 'bg-gray-100 p-1 rounded-lg' : ''}
        `}
        role="tablist"
        aria-label="Navigation tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            tabIndex={tab.id === activeTab ? 0 : -1}
            aria-selected={tab.id === activeTab}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
            disabled={tab.disabled}
            className={getTabClasses(tab)}
          >
            {tab.icon && (
              <tab.icon className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="
                ml-2 flex-shrink-0 rounded-full bg-gray-600 text-white 
                text-xs px-2 py-0.5 min-w-[1.25rem] text-center
              ">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {showContent && activeTabContent && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="mt-6"
          tabIndex={0}
        >
          {activeTabContent}
        </div>
      )}
    </div>
  );
}

// Skip link component for keyboard users
export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className = '' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
        bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        z-50 transition-all
        ${className}
      `}
    >
      {children}
    </a>
  );
}

// Mobile navigation menu
export interface MobileNavigationProps {
  items: NavigationItem[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MobileNavigation({
  items,
  isOpen,
  onClose,
  className = '',
}: MobileNavigationProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const renderMobileItem = (item: NavigationItem, index: number) => {
    const isActive = item.href && pathname === item.href;
    
    const baseClasses = `
      flex items-center gap-3 px-4 py-3 text-base font-medium
      border-b border-gray-200 last:border-b-0
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
      ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
    `;

    const handleClick = () => {
      if (item.onClick) {
        item.onClick();
      }
      onClose();
    };

    const content = (
      <>
        {item.icon && (
          <item.icon className="h-5 w-5 flex-shrink-0" />
        )}
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="
            flex-shrink-0 rounded-full bg-blue-600 text-white 
            text-xs px-2 py-1 min-w-[1.5rem] text-center
          ">
            {item.badge}
          </span>
        )}
      </>
    );

    if (item.href) {
      return (
        <Link
          key={index}
          href={item.href}
          className={baseClasses}
          onClick={onClose}
          aria-current={isActive ? 'page' : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={index}
        onClick={handleClick}
        className={`${baseClasses} w-full text-left`}
        disabled={item.disabled}
      >
        {content}
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Navigation Panel */}
      <nav
        ref={navRef}
        className={`
          fixed inset-y-0 left-0 w-80 max-w-full bg-white shadow-xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${className}
        `}
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="
              p-2 text-gray-400 hover:text-gray-600 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              rounded-md
            "
            aria-label="Close navigation"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="overflow-y-auto">
          {items.map(renderMobileItem)}
        </div>
      </nav>
    </>
  );
}