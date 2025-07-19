// Card brand icon components (32x20px SVG icons)
import React from 'react';

export const VisaIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 32 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="20" rx="4" fill="white"/>
    <path
      d="M13.8 6.4L11.2 13.6H9.4L8.1 8.2C7.9 7.4 7.8 7.1 7.4 6.8C6.8 6.4 5.9 6 5 5.8L5.1 5.4H8.9C9.6 5.4 10.2 5.9 10.4 6.7L11.2 10.7L13.1 5.4H14.9L13.8 6.4ZM19.2 13.6H17.5L18.7 5.4H20.4L19.2 13.6ZM24.1 7.8C24.1 7.1 23.6 6.6 22.6 6.2C21.9 5.9 21.5 5.7 21.5 5.4C21.5 5.1 21.8 4.8 22.4 4.8C23.1 4.8 23.6 5 24 5.2L24.3 5.4L24.7 3.7C24.3 3.5 23.6 3.2 22.8 3.2C21.2 3.2 20.1 4.1 20.1 5.3C20.1 6.2 20.9 6.8 21.5 7.1C22.1 7.4 22.3 7.6 22.3 7.9C22.3 8.3 21.9 8.5 21.4 8.5C20.6 8.5 20.1 8.3 19.6 8.1L19.3 7.9L18.9 9.7C19.4 9.9 20.2 10.1 21.1 10.1C22.8 10.1 23.9 9.2 24.1 7.8ZM28.5 13.6H26.9C26.4 13.6 26 13.3 25.8 12.9L22.8 5.4H24.6L25.3 7.1H27.5L27.7 5.4H29.3L28.5 13.6ZM26.1 8.7L26.9 10.9L25.7 8.7H26.1Z"
      fill="#1A1F71"
    />
  </svg>
);

export const MastercardIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 32 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="20" rx="4" fill="white"/>
    <circle cx="12" cy="10" r="6" fill="#EB001B"/>
    <circle cx="20" cy="10" r="6" fill="#F79E1B"/>
    <path
      d="M16 6.5C17.2 7.5 18 9.1 18 10.9C18 12.7 17.2 14.3 16 15.3C14.8 14.3 14 12.7 14 10.9C14 9.1 14.8 7.5 16 6.5Z"
      fill="#FF5F00"
    />
  </svg>
);

export const AmexIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 32 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="20" rx="4" fill="#006FCF"/>
    <path
      d="M5.5 7.5L6.2 5.5H7.8L8.5 7.5L9.2 5.5H10.8L9.5 9.5H8.5L7.8 7.5L7.1 9.5H6.1L4.8 5.5H6.4L5.5 7.5ZM12 9.5V5.5H15V6.5H13V7H14.5V8H13V8.5H15V9.5H12ZM17.5 9.5L16 5.5H17.5L18.2 8L19 5.5H20.5L19 9.5H17.5ZM22 9.5V5.5H25V6.5H23V7H24.5V8H23V8.5H25V9.5H22Z"
      fill="white"
    />
    <path
      d="M5 14.5L5.7 12.5H7.3L8 14.5L8.7 12.5H10.3L9 16.5H8L7.3 14.5L6.6 16.5H5.6L4.3 12.5H5.9L5 14.5ZM11.5 16.5V12.5H14.5V13.5H12.5V14H14V15H12.5V15.5H14.5V16.5H11.5ZM17 16.5L15.5 12.5H17L17.7 15L18.5 12.5H20L18.5 16.5H17ZM21.5 16.5V12.5H24.5V13.5H22.5V14H24V15H22.5V15.5H24.5V16.5H21.5Z"
      fill="white"
    />
  </svg>
);

export const DiscoverIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 32 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="20" rx="4" fill="white"/>
    <ellipse cx="26" cy="10" rx="12" ry="10" fill="#FF6000"/>
    <path
      d="M6 7.5V12.5H8C9.1 12.5 10 11.6 10 10.5V9.5C10 8.4 9.1 7.5 8 7.5H6ZM7 8.5H8C8.6 8.5 9 8.9 9 9.5V10.5C9 11.1 8.6 11.5 8 11.5H7V8.5Z"
      fill="#FF6000"
    />
    <path
      d="M11 7.5V12.5H12V7.5H11ZM13.5 9.5C13.2 9.5 13 9.3 13 9C13 8.7 13.2 8.5 13.5 8.5C13.8 8.5 14 8.7 14 9C14 9.3 13.8 9.5 13.5 9.5ZM13 10H14V12.5H13V10Z"
      fill="#FF6000"
    />
  </svg>
);

export const DefaultCardIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 32 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="20" rx="4" fill="white" stroke="#E5E7EB"/>
    <rect x="4" y="6" width="24" height="2" rx="1" fill="#9CA3AF"/>
    <rect x="4" y="10" width="12" height="1.5" rx="0.75" fill="#D1D5DB"/>
    <rect x="4" y="12.5" width="8" height="1.5" rx="0.75" fill="#D1D5DB"/>
    <rect x="20" y="10" width="8" height="4" rx="2" fill="#F3F4F6"/>
  </svg>
);

// Card brand icon mapping
export const cardBrandIcons = {
  visa: VisaIcon,
  mastercard: MastercardIcon,
  amex: AmexIcon,
  discover: DiscoverIcon,
  default: DefaultCardIcon,
} as const;