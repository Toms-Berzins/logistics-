'use client';

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function TestAuthPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          setAuthToken(token);
        } catch (error) {
          console.error('Failed to get auth token:', error);
        }
      }
    };
    
    fetchToken();
  }, [isSignedIn, getToken]);

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Authentication Test Page
          </h1>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Auth Status</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Loaded:</span> {isLoaded ? '✅ Yes' : '❌ No'}</p>
                  <p><span className="font-medium">Signed In:</span> {isSignedIn ? '✅ Yes' : '❌ No'}</p>
                  <p><span className="font-medium">Middleware:</span> ✅ Working (you can see this page)</p>
                </div>
              </div>
              
              {isSignedIn && user && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">User Info</h3>
                  <div className="space-y-2 text-sm text-green-800">
                    <p><span className="font-medium">User ID:</span> {user.id}</p>
                    <p><span className="font-medium">Email:</span> {user.primaryEmailAddress?.emailAddress}</p>
                    <p><span className="font-medium">Name:</span> {user.firstName} {user.lastName}</p>
                  </div>
                </div>
              )}
            </div>
            
            {authToken && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Auth Token</h3>
                <div className="text-xs text-blue-800 font-mono break-all">
                  {authToken.substring(0, 50)}...
                </div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="block w-full p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center"
                >
                  <div className="font-medium text-blue-900">Dashboard</div>
                  <div className="text-xs text-blue-700">Protected route</div>
                </button>
                <button 
                  onClick={() => window.location.href = '/dashboard/analytics'}
                  className="block w-full p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center"
                >
                  <div className="font-medium text-purple-900">Analytics</div>
                  <div className="text-xs text-purple-700">KPI Dashboard</div>
                </button>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="block w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-center"
                >
                  <div className="font-medium text-gray-900">Home</div>
                  <div className="text-xs text-gray-700">Public route</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}