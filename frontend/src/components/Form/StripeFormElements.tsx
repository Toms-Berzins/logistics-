'use client';

import React, { useState } from 'react';
import { 
  useStripe, 
  useElements, 
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  Elements,
  StripeCardNumberElementChangeEvent,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ExclamationCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { paymentTokens } from '../../styles/payment-tokens';
import { cardBrandIcons } from '../../assets/icons/card-brands/index';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

// Stripe Elements styling to match our design tokens
const stripeElementsOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#374151',
      fontFamily: '"Inter", sans-serif',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: '#9CA3AF',
      },
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
    complete: {
      color: '#059669',
    },
  },
};

// Form validation state interface
interface FormErrors {
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  holderName?: string;
  general?: string;
}

interface FormData {
  holderName: string;
  billingAddress?: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface StripeCardFormProps {
  onSuccess: (paymentMethod: unknown) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
  submitButtonText?: string;
  showBillingAddress?: boolean;
  initialData?: Partial<FormData>;
  className?: string;
}

// Main form component (wrapped with Elements provider)
export const StripeCardForm: React.FC<StripeCardFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise} options={{ appearance: { theme: 'stripe' } }}>
      <CardFormContent {...props} />
    </Elements>
  );
};

// Form content component
const CardFormContent: React.FC<StripeCardFormProps> = ({
  onSuccess,
  onError,
  isLoading = false,
  submitButtonText = 'Add Card',
  showBillingAddress = false,
  initialData,
  className = '',
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [formData, setFormData] = useState<FormData>({
    holderName: initialData?.holderName || '',
    billingAddress: initialData?.billingAddress || {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
    },
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [cardBrand, setCardBrand] = useState<string>('default');
  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Handle card element changes
  const handleCardChange = (event: StripeCardNumberElementChangeEvent) => {
    if (event.brand) {
      setCardBrand(event.brand);
    }
    
    setCardComplete(event.complete);
    
    // Clear card number error when user starts typing
    if (event.elementType === 'cardNumber' && errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: undefined }));
    }
    
    // Set error if there's an error
    if (event.error) {
      setErrors(prev => ({
        ...prev,
        [event.elementType === 'cardNumber' ? 'cardNumber' : 
         event.elementType === 'cardExpiry' ? 'expiry' : 'cvc']: event.error.message
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.holderName.trim()) {
      newErrors.holderName = 'Cardholder name is required';
    }
    
    if (showBillingAddress) {
      if (!formData.billingAddress?.line1?.trim()) {
        newErrors.general = 'Billing address is required';
      }
      if (!formData.billingAddress?.city?.trim()) {
        newErrors.general = 'City is required';
      }
      if (!formData.billingAddress?.postal_code?.trim()) {
        newErrors.general = 'Postal code is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setProcessing(true);
    setErrors({});
    
    const cardElement = elements.getElement(CardNumberElement);
    
    if (!cardElement) {
      onError('Card element not found');
      setProcessing(false);
      return;
    }
    
    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: formData.holderName,
          ...(showBillingAddress && formData.billingAddress && {
            address: formData.billingAddress,
          }),
        },
      });
      
      if (error) {
        onError(error.message || 'An error occurred while processing your card');
      } else {
        onSuccess(paymentMethod);
      }
    } catch {
      onError('An unexpected error occurred. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const CardBrandIcon = cardBrandIcons[cardBrand as keyof typeof cardBrandIcons] || cardBrandIcons.default;

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Cardholder Name */}
      <div>
        <label className={`${paymentTokens.forms.label.base} ${paymentTokens.forms.label.required}`}>
          Cardholder Name
        </label>
        <input
          type="text"
          value={formData.holderName}
          onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
          className={`
            ${paymentTokens.forms.input.base}
            ${errors.holderName ? paymentTokens.forms.input.error : ''}
          `}
          placeholder="John Doe"
          disabled={isLoading || processing}
          data-testid="cardholder-name-input"
        />
        {errors.holderName && (
          <div className="flex items-center mt-1">
            <ExclamationCircleIcon className={paymentTokens.forms.error.icon} />
            <span className={paymentTokens.forms.error.message}>{errors.holderName}</span>
          </div>
        )}
      </div>

      {/* Card Number */}
      <div>
        <label className={`${paymentTokens.forms.label.base} ${paymentTokens.forms.label.required}`}>
          Card Number
        </label>
        <div className="relative">
          <div className={`
            ${paymentTokens.forms.input.base}
            ${errors.cardNumber ? paymentTokens.forms.input.error : ''}
            flex items-center pr-12
          `}>
            <div className="flex-1">
              <CardNumberElement
                options={stripeElementsOptions}
                onChange={handleCardChange}
              />
            </div>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <CardBrandIcon className="w-8 h-5" />
            </div>
          </div>
        </div>
        {errors.cardNumber && (
          <div className="flex items-center mt-1">
            <ExclamationCircleIcon className={paymentTokens.forms.error.icon} />
            <span className={paymentTokens.forms.error.message}>{errors.cardNumber}</span>
          </div>
        )}
      </div>

      {/* Expiry and CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`${paymentTokens.forms.label.base} ${paymentTokens.forms.label.required}`}>
            Expiry Date
          </label>
          <div className={`
            ${paymentTokens.forms.input.base}
            ${errors.expiry ? paymentTokens.forms.input.error : ''}
          `}>
            <CardExpiryElement
              options={stripeElementsOptions}
              onChange={handleCardChange}
            />
          </div>
          {errors.expiry && (
            <div className="flex items-center mt-1">
              <ExclamationCircleIcon className={paymentTokens.forms.error.icon} />
              <span className={paymentTokens.forms.error.message}>{errors.expiry}</span>
            </div>
          )}
        </div>

        <div>
          <label className={`${paymentTokens.forms.label.base} ${paymentTokens.forms.label.required}`}>
            CVC
          </label>
          <div className={`
            ${paymentTokens.forms.input.base}
            ${errors.cvc ? paymentTokens.forms.input.error : ''}
          `}>
            <CardCvcElement
              options={stripeElementsOptions}
              onChange={handleCardChange}
            />
          </div>
          {errors.cvc && (
            <div className="flex items-center mt-1">
              <ExclamationCircleIcon className={paymentTokens.forms.error.icon} />
              <span className={paymentTokens.forms.error.message}>{errors.cvc}</span>
            </div>
          )}
        </div>
      </div>

      {/* Billing Address (optional) */}
      {showBillingAddress && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Billing Address</h3>
          
          <div>
            <label className={`${paymentTokens.forms.label.base} ${paymentTokens.forms.label.required}`}>
              Address Line 1
            </label>
            <input
              type="text"
              value={formData.billingAddress?.line1 || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                billingAddress: { ...prev.billingAddress!, line1: e.target.value }
              }))}
              className={paymentTokens.forms.input.base}
              placeholder="123 Main Street"
              disabled={isLoading || processing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={paymentTokens.forms.label.base}>City</label>
              <input
                type="text"
                value={formData.billingAddress?.city || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  billingAddress: { ...prev.billingAddress!, city: e.target.value }
                }))}
                className={paymentTokens.forms.input.base}
                placeholder="San Francisco"
                disabled={isLoading || processing}
              />
            </div>

            <div>
              <label className={paymentTokens.forms.label.base}>State</label>
              <input
                type="text"
                value={formData.billingAddress?.state || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  billingAddress: { ...prev.billingAddress!, state: e.target.value }
                }))}
                className={paymentTokens.forms.input.base}
                placeholder="CA"
                disabled={isLoading || processing}
              />
            </div>
          </div>

          <div>
            <label className={paymentTokens.forms.label.base}>Postal Code</label>
            <input
              type="text"
              value={formData.billingAddress?.postal_code || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                billingAddress: { ...prev.billingAddress!, postal_code: e.target.value }
              }))}
              className={paymentTokens.forms.input.base}
              placeholder="94102"
              disabled={isLoading || processing}
            />
          </div>
        </div>
      )}

      {/* General Error */}
      {errors.general && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
          <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-sm text-red-700">{errors.general}</span>
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <LockClosedIcon className="w-4 h-4 text-gray-500 mr-2" />
        <span className="text-sm text-gray-600">
          Secured by Stripe • Your card information is encrypted and secure
        </span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isLoading || processing || !cardComplete}
        className={`
          w-full
          ${paymentTokens.buttons.primary}
          ${(!stripe || isLoading || processing || !cardComplete) ? 'opacity-50 cursor-not-allowed' : ''}
          ${paymentTokens.accessibility.touchTarget}
        `}
        data-testid="submit-card-form"
      >
        {processing ? (
          <div className="flex items-center justify-center">
            <div className={paymentTokens.loading.spinner} />
            <span className="ml-2">Processing...</span>
          </div>
        ) : (
          submitButtonText
        )}
      </button>
    </form>
  );
};

// Standalone input components for custom forms
export const StyledCardInput: React.FC<{
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, error, required = false, children }) => {
  return (
    <div>
      <label className={`${paymentTokens.forms.label.base} ${required ? paymentTokens.forms.label.required : ''}`}>
        {label}
      </label>
      <div className={`
        ${paymentTokens.forms.input.base}
        ${error ? paymentTokens.forms.input.error : ''}
      `}>
        {children}
      </div>
      {error && (
        <div className="flex items-center mt-1">
          <ExclamationCircleIcon className={paymentTokens.forms.error.icon} />
          <span className={paymentTokens.forms.error.message}>{error}</span>
        </div>
      )}
    </div>
  );
};

export default StripeCardForm;