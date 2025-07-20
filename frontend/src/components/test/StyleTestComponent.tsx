'use client';

import React, { useState } from 'react';

/**
 * Test component to verify that style updates are working properly
 * This component uses obvious visual changes to isolate styling issues
 */
export const StyleTestComponent: React.FC = () => {
  const [testColor, setTestColor] = useState<'red' | 'green' | 'blue' | 'purple'>('red');
  const [isVisible, setIsVisible] = useState(true);

  const colorClasses = {
    red: 'bg-red-500 text-white border-red-600',
    green: 'bg-green-500 text-white border-green-600',  
    blue: 'bg-blue-500 text-white border-blue-600',
    purple: 'bg-purple-500 text-white border-purple-600',
  };

  const nextColor = {
    red: 'green' as const,
    green: 'blue' as const,
    blue: 'purple' as const,
    purple: 'red' as const,
  };

  return (
    <div className="p-8 space-y-6 min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🎨 Style Update Test Component
        </h1>
        <p className="text-gray-600 mb-6">
          This component tests if style changes are reflected immediately in the browser.
        </p>

        {/* Color Test */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Color Test</h2>
          <div 
            className={`
              p-6 rounded-lg border-4 transition-all duration-300 cursor-pointer
              ${colorClasses[testColor]}
              hover:scale-105 hover:shadow-xl
            `}
            onClick={() => setTestColor(nextColor[testColor])}
          >
            <p className="text-lg font-medium">
              Click me! Current color: {testColor}
            </p>
            <p className="text-sm opacity-90">
              This should change color immediately when clicked.
            </p>
          </div>
        </div>

        {/* Visibility Test */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Visibility Test</h2>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Toggle Visibility
          </button>
          
          {isVisible && (
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 animate-fade-in">
              <p className="text-yellow-800 font-medium">
                ✅ This element should appear/disappear smoothly with animation
              </p>
            </div>
          )}
        </div>

        {/* Tailwind JIT Test */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Tailwind JIT Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Test arbitrary values (JIT specific) */}
            <div className="p-4 bg-[#FF6B6B] text-white rounded-lg">
              <p className="font-medium">Arbitrary Color</p>
              <p className="text-sm opacity-90">bg-[#FF6B6B]</p>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg">
              <p className="font-medium">Gradient</p>
              <p className="text-sm opacity-90">from-cyan-500 to-blue-500</p>
            </div>
            
            <div className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg">
              <p className="font-medium text-gray-700">Dashed Border</p>
              <p className="text-sm text-gray-500">border-dashed</p>
            </div>
          </div>
        </div>

        {/* Custom Classes Test */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Custom Classes Test</h2>
          <div className="logistics-grid">
            <div className="status-indicator available">
              <span className="w-2 h-2 bg-current rounded-full"></span>
              Available Driver
            </div>
            <div className="status-indicator busy">
              <span className="w-2 h-2 bg-current rounded-full animate-pulse"></span>
              Busy Driver
            </div>
            <div className="status-indicator offline">
              <span className="w-2 h-2 bg-current rounded-full"></span>
              Offline Driver
            </div>
          </div>
        </div>

        {/* Animation Test */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Animation Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-100 rounded-lg animate-pulse">
              <p className="text-blue-800 font-medium">Pulse Animation</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg animate-bounce">
              <p className="text-green-800 font-medium">Bounce Animation</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-lg animate-slide-in">
              <p className="text-purple-800 font-medium">Custom Slide In</p>
            </div>
          </div>
        </div>

        {/* Console Test */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Console Test</h2>
          <button
            onClick={() => {
              console.log('🎨 Style Test: Button clicked at', new Date().toLocaleTimeString());
              console.log('🎨 Current test color:', testColor);
              console.log('🎨 Visibility state:', isVisible);
            }}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
          >
            Log to Console
          </button>
          <p className="text-sm text-gray-600">
            Check browser console for debug information
          </p>
        </div>

        {/* Cache Buster */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            🔄 Last rendered: {new Date().toLocaleTimeString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This timestamp should update immediately when the component re-renders
          </p>
        </div>
      </div>
    </div>
  );
};

export default StyleTestComponent;