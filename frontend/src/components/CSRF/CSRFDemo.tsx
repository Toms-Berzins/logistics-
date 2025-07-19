'use client';

import React, { useState } from 'react';
import { useCSRFToken, fetchWithCSRF } from '../../lib/csrf';

/**
 * Demo component showing CSRF token usage
 * This can be used for testing and as an example for developers
 */
export const CSRFDemo: React.FC = () => {
  const { token, isLoading, error, refreshToken } = useCSRFToken();
  const [testResult, setTestResult] = useState<string>('');
  const [isTestLoading, setIsTestLoading] = useState(false);

  const testCSRFProtection = async () => {
    setIsTestLoading(true);
    setTestResult('');

    try {
      // Test POST request to a protected endpoint
      const response = await fetchWithCSRF('/api/auth/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'csrf-protection' }),
      });

      if (response.ok) {
        setTestResult('✅ CSRF protection working correctly');
      } else {
        const data = await response.json().catch(() => ({}));
        setTestResult(`❌ Request failed: ${response.status} - ${data.message || response.statusText}`);
      }
    } catch (err) {
      setTestResult(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTestLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">CSRF Protection Status</h2>
      
      {/* Token Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">CSRF Token Status</h3>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            {isLoading ? (
              <span className="text-yellow-600">Loading...</span>
            ) : error ? (
              <span className="text-red-600">Error: {error}</span>
            ) : token ? (
              <span className="text-green-600">Token Available</span>
            ) : (
              <span className="text-red-600">No Token</span>
            )}
          </div>
          
          {token && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Token:</span>
              <code className="text-sm bg-gray-200 px-2 py-1 rounded font-mono">
                {token.substring(0, 20)}...
              </code>
            </div>
          )}
        </div>
        
        <button
          onClick={refreshToken}
          disabled={isLoading}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Token'}
        </button>
      </div>

      {/* Test CSRF Protection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Test CSRF Protection</h3>
        
        <p className="text-gray-600 mb-4">
          Click the button below to test a POST request with CSRF protection.
        </p>
        
        <button
          onClick={testCSRFProtection}
          disabled={isTestLoading || !token}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTestLoading ? 'Testing...' : 'Test CSRF Protection'}
        </button>
        
        {testResult && (
          <div className="mt-3 p-3 bg-white border rounded-md">
            <pre className="text-sm">{testResult}</pre>
          </div>
        )}
      </div>

      {/* Usage Examples */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Usage Examples</h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-1">1. Using the enhanced fetch:</h4>
            <code className="block bg-white p-2 rounded border text-xs">
              {`import { fetchWithCSRF } from './lib/csrf';

// CSRF token is automatically added to POST requests
const response = await fetchWithCSRF('/api/data', {
  method: 'POST',
  body: JSON.stringify(data)
});`}
            </code>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-800 mb-1">2. Using the React hook:</h4>
            <code className="block bg-white p-2 rounded border text-xs">
              {`const { token, isLoading, error } = useCSRFToken();

// Use token in manual requests
headers['csrf-token'] = token;`}
            </code>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-800 mb-1">3. Forms (automatic):</h4>
            <code className="block bg-white p-2 rounded border text-xs">
              {`<!-- CSRF token is automatically added to forms on submit -->
<form method="POST" action="/api/submit">
  <input type="text" name="data" />
  <button type="submit">Submit</button>
</form>`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSRFDemo;