'use client';

import React from 'react';
import { PaymentMethodsList } from '@/components/PaymentMethods/PaymentMethodsList';

export default function PaymentMethodsPage() {
  // Mock handlers - replace with actual API calls
  const handleAddPaymentMethod = async (paymentMethod: unknown) => {
    console.log('Adding payment method:', paymentMethod);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleUpdatePaymentMethod = async (id: string, paymentMethod: unknown) => {
    console.log('Updating payment method:', id, paymentMethod);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleDeletePaymentMethod = async (id: string) => {
    console.log('Deleting payment method:', id);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleSetDefaultPaymentMethod = async (id: string) => {
    console.log('Setting default payment method:', id);
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PaymentMethodsList
        onAddPaymentMethod={handleAddPaymentMethod}
        onUpdatePaymentMethod={handleUpdatePaymentMethod}
        onDeletePaymentMethod={handleDeletePaymentMethod}
        onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
      />
    </div>
  );
}