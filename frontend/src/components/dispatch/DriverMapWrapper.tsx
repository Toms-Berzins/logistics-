'use client';

import dynamic from 'next/dynamic';
import { Loading } from '../ui';

// Dynamically import DriverMap with no SSR to prevent hydration issues
const DriverMapNoSSR = dynamic(() => import('./DriverMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-neutral-50">
      <Loading 
        size="lg" 
        text="Loading driver map..." 
        variant="spinner"
        color="primary"
      />
    </div>
  )
});

export default DriverMapNoSSR;