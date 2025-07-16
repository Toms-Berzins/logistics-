'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * Higher-order component that disables SSR for components that have hydration issues
 * Use this for components that rely on browser-only APIs or real-time data
 */
function NoSSR<T extends object>(Component: ComponentType<T>) {
  return dynamic(() => Promise.resolve(Component), {
    ssr: false,
    loading: () => <div>Loading...</div>
  });
}

export default NoSSR;