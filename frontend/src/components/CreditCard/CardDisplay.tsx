'use client';

import React from 'react';
import { StarIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import { paymentTokens, cardBrands, getCardBrand, maskCardNumber } from '../../styles/payment-tokens';
import { cardBrandIcons } from '../../assets/icons/card-brands/index';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
  holderName?: string;
}

interface CardDisplayProps {
  paymentMethod: PaymentMethod;
  variant?: 'visual' | 'compact';
  showActions?: boolean;
  onSetDefault?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
  'data-testid'?: string;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
  paymentMethod,
  variant = 'visual',
  showActions = true,
  onSetDefault,
  onEdit,
  onDelete,
  className = '',
  'data-testid': dataTestId,
}) => {
  const cardBrand = getCardBrand(paymentMethod.last4);
  const brandConfig = cardBrands[cardBrand];
  const CardBrandIcon = cardBrandIcons[cardBrand];
  
  const maskedNumber = maskCardNumber('************' + paymentMethod.last4);
  const formattedExpiry = `${paymentMethod.expMonth.toString().padStart(2, '0')}/${paymentMethod.expYear.toString().slice(-2)}`;

  if (variant === 'compact') {
    return (
      <div 
        className={`${paymentTokens.cards.management.base} ${paymentTokens.cards.management.focus} ${className}`}
        data-testid={dataTestId}
      >
        <div className={paymentTokens.cards.management.content}>
          <div className={paymentTokens.cards.management.info}>
            {/* Card Brand Icon */}
            <div className="flex-shrink-0">
              <CardBrandIcon className="w-10 h-6" />
            </div>
            
            {/* Card Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={paymentTokens.typography.cardBrand}>
                  {brandConfig.name}
                </span>
                <span className={paymentTokens.typography.cardNumber}>
                  •••• {paymentMethod.last4}
                </span>
                {paymentMethod.isDefault && (
                  <span className={`${paymentTokens.badges.default.base} ${paymentTokens.badges.default.colors}`}>
                    <StarIcon className={paymentTokens.badges.default.icon} />
                    Default
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {paymentMethod.holderName && `${paymentMethod.holderName} • `}
                Expires {formattedExpiry}
              </div>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className={paymentTokens.cards.management.actions}>
              <CardActionsDropdown
                paymentMethod={paymentMethod}
                onSetDefault={onSetDefault}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${paymentTokens.cards.dimensions.width} ${paymentTokens.cards.dimensions.height} ${className}`}
      data-testid={dataTestId}
    >
      <div
        className={`
          ${paymentTokens.cards.dimensions.borderRadius}
          ${paymentTokens.cards.visual.base}
          ${paymentTokens.cards.visual.hover}
          ${paymentTokens.cards.visual.focus}
          ${paymentTokens.cards.visual.gradient}
          ${brandConfig.colors}
          ${brandConfig.textColor}
        `}
      >
        {/* Card Content Overlay */}
        <div className={paymentTokens.cards.content.overlay}>
          
          {/* Default Badge */}
          {paymentMethod.isDefault && (
            <div className="absolute top-4 left-4">
              <span className={`${paymentTokens.badges.default.base} ${paymentTokens.badges.default.colors}`}>
                <StarIcon className={paymentTokens.badges.default.icon} />
                Default
              </span>
            </div>
          )}

          {/* Card Brand Icon */}
          <div className={paymentTokens.cards.content.brandIcon}>
            <CardBrandIcon className="w-8 h-5" />
          </div>

          {/* Chip Simulation */}
          <div className="absolute top-12 left-6 w-8 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded opacity-80"></div>

          {/* Card Number */}
          <div className={paymentTokens.cards.content.cardNumber}>
            <span className={paymentTokens.typography.cardNumber}>
              {maskedNumber}
            </span>
          </div>

          {/* Card Holder Name */}
          {paymentMethod.holderName && (
            <div className={paymentTokens.cards.content.cardHolder}>
              <div className="text-xs opacity-75 mb-1">CARDHOLDER NAME</div>
              <div className={paymentTokens.typography.cardHolder}>
                {paymentMethod.holderName.toUpperCase()}
              </div>
            </div>
          )}

          {/* Expiry Date */}
          <div className={paymentTokens.cards.content.expiry}>
            <div className="text-xs opacity-75 mb-1">EXPIRES</div>
            <div className={paymentTokens.typography.cardExpiry}>
              {formattedExpiry}
            </div>
          </div>

          {/* Actions Menu (if enabled) */}
          {showActions && (
            <div className="absolute top-4 right-12">
              <CardActionsDropdown
                paymentMethod={paymentMethod}
                onSetDefault={onSetDefault}
                onEdit={onEdit}
                onDelete={onDelete}
                variant="overlay"
              />
            </div>
          )}
        </div>

        {/* Security Indicator */}
        <div className="absolute bottom-2 right-2">
          <LockClosedIcon className="w-3 h-3 opacity-60" />
        </div>
      </div>
    </div>
  );
};

// Card Actions Dropdown Component
interface CardActionsDropdownProps {
  paymentMethod: PaymentMethod;
  onSetDefault?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  variant?: 'default' | 'overlay';
}

const CardActionsDropdown: React.FC<CardActionsDropdownProps> = ({
  paymentMethod,
  onSetDefault,
  onEdit,
  onDelete,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSetDefault = () => {
    onSetDefault?.(paymentMethod.id);
    setIsOpen(false);
  };

  const handleEdit = () => {
    onEdit?.(paymentMethod.id);
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete?.(paymentMethod.id);
    setIsOpen(false);
  };

  const triggerClassName = variant === 'overlay' 
    ? 'text-white hover:bg-white hover:bg-opacity-20'
    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100';

  return (
    <div className={paymentTokens.dropdown.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${paymentTokens.dropdown.trigger} ${triggerClassName}`}
        aria-label="Card actions menu"
        data-testid="card-actions-trigger"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className={paymentTokens.dropdown.menu} data-testid="card-actions-menu">
            {!paymentMethod.isDefault && onSetDefault && (
              <button
                onClick={handleSetDefault}
                className={paymentTokens.dropdown.item}
                data-testid="set-default-action"
              >
                <StarIcon className="w-4 h-4 mr-2 text-yellow-500" />
                Set as Default
              </button>
            )}
            
            {onEdit && (
              <button
                onClick={handleEdit}
                className={paymentTokens.dropdown.item}
                data-testid="edit-action"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Card
              </button>
            )}
            
            {onDelete && (
              <>
                <div className={paymentTokens.dropdown.separator} />
                <button
                  onClick={handleDelete}
                  className={`${paymentTokens.dropdown.item} text-red-600 hover:bg-red-50`}
                  data-testid="delete-action"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Card
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Add New Card CTA Component
interface AddNewCardProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const AddNewCard: React.FC<AddNewCardProps> = ({
  onClick,
  isLoading = false,
  className = '',
  'data-testid': dataTestId,
}) => {
  return (
    <div 
      className={`${paymentTokens.cards.dimensions.width} ${paymentTokens.cards.dimensions.height} ${className}`}
      data-testid={dataTestId}
    >
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`
          group w-full h-full
          ${paymentTokens.cards.dimensions.borderRadius}
          ${paymentTokens.cards.addCard.base}
          ${paymentTokens.accessibility.focusRing}
          flex flex-col items-center justify-center
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label="Add new payment method"
      >
        {isLoading ? (
          <div className={paymentTokens.loading.spinner} />
        ) : (
          <>
            <svg 
              className={paymentTokens.cards.addCard.icon}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className={`${paymentTokens.cards.addCard.text} mt-2 font-medium`}>
              Add New Card
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default CardDisplay;