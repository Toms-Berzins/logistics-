'use client';

import dynamic from 'next/dynamic';

// Dynamically import DriverMap with no SSR to prevent hydration issues
const DriverMapNoSSR = dynamic(() => import('./DriverMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading driver map...</p>
      </div>
    </div>
  )
});

export default DriverMapNoSSR;