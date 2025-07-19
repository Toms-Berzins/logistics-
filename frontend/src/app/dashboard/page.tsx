'use client';

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to LogiTrack Dashboard
          </h1>
          <p className="text-gray-600 mb-4">
            Hello, {user?.firstName || user?.primaryEmailAddress?.emailAddress}! 
            Manage your logistics operations from here.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📍 Driver Tracking</h3>
              <p className="text-blue-700 text-sm">
                Real-time location monitoring and route optimization
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">📦 Job Management</h3>
              <p className="text-green-700 text-sm">
                Assign and track delivery jobs and schedules
              </p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">📊 Analytics</h3>
              <p className="text-purple-700 text-sm">
                Performance metrics and operational insights
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
          <div className="space-y-2">
            <p><span className="font-medium">User ID:</span> {user?.id}</p>
            <p><span className="font-medium">Email:</span> {user?.primaryEmailAddress?.emailAddress}</p>
            <p><span className="font-medium">First Name:</span> {user?.firstName || "Not provided"}</p>
            <p><span className="font-medium">Last Name:</span> {user?.lastName || "Not provided"}</p>
            <p><span className="font-medium">Created:</span> {user?.createdAt?.toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}