// Payment methods specific design tokens for secure card management
export const paymentTokens = {
  layout: {
    container: 'mx-auto px-4 py-6 max-w-6xl',
    grid: 'grid gap-6',
    gridCols: {
      mobile: 'grid-cols-1',
      desktop: 'md:grid-cols-2',
    },
    section: 'space-y-6',
  },
  
  cards: {
    // Physical credit card dimensions (maintaining aspect ratio)
    dimensions: {
      width: 'w-80', // 320px as specified
      height: 'h-48', // Maintains credit card aspect ratio (1.6:1)
      borderRadius: 'rounded-xl',
    },
    
    // Visual card styling
    visual: {
      base: 'relative overflow-hidden shadow-lg transition-all duration-200',
      hover: 'hover:shadow-xl hover:scale-105',
      focus: 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
      gradient: 'bg-gradient-to-br',
      
      // Card brand backgrounds
      visa: 'from-blue-600 to-blue-800',
      mastercard: 'from-red-600 to-orange-600',
      amex: 'from-green-600 to-teal-700',
      discover: 'from-orange-500 to-orange-700',
      default: 'from-gray-600 to-gray-800',
    },
    
    // Add new card CTA
    addCard: {
      base: 'relative border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer',
      icon: 'w-12 h-12 text-gray-400 group-hover:text-blue-500',
      text: 'text-gray-600 group-hover:text-blue-600',
    },
    
    // Card content positioning
    content: {
      overlay: 'absolute inset-0 p-6 text-white',
      brandIcon: 'absolute top-4 right-4 w-8 h-5',
      cardNumber: 'absolute bottom-16 left-6 text-lg font-mono tracking-wider',
      cardHolder: 'absolute bottom-8 left-6 text-sm opacity-90',
      expiry: 'absolute bottom-8 right-6 text-sm opacity-90',
    },
    
    // Management cards (list view)
    management: {
      base: 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200',
      focus: 'focus-within:ring-2 focus-within:ring-blue-500',
      content: 'flex items-center justify-between',
      info: 'flex items-center space-x-4',
      actions: 'flex items-center space-x-2',
    },
  },
  
  typography: {
    cardNumber: 'text-lg font-mono font-semibold tracking-wider',
    cardHolder: 'text-sm font-medium',
    cardExpiry: 'text-sm',
    cardBrand: 'text-xs uppercase tracking-wide opacity-75',
    sectionTitle: 'text-2xl font-bold text-gray-900',
    sectionSubtitle: 'text-gray-600',
  },
  
  badges: {
    default: {
      base: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
      colors: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      icon: 'w-3 h-3 mr-1 text-yellow-600',
    },
    security: {
      base: 'inline-flex items-center text-xs text-gray-500',
      icon: 'w-3 h-3 mr-1',
    },
  },
  
  buttons: {
    primary: 'inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    secondary: 'inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    danger: 'inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
    ghost: 'inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200',
  },
  
  forms: {
    // Stripe Elements styling
    input: {
      base: 'w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200',
      error: 'border-red-300 focus:ring-red-500 focus:border-red-500',
      success: 'border-green-300 focus:ring-green-500 focus:border-green-500',
    },
    
    label: {
      base: 'block text-sm font-medium text-gray-700 mb-1',
      required: 'after:content-["*"] after:text-red-500 after:ml-1',
    },
    
    error: {
      message: 'text-sm text-red-600 mt-1',
      icon: 'w-4 h-4 text-red-500',
    },
    
    help: {
      text: 'text-sm text-gray-500 mt-1',
      icon: 'w-4 h-4 text-gray-400',
    },
  },
  
  modal: {
    backdrop: 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50',
    container: 'fixed inset-0 flex items-center justify-center p-4 z-50',
    content: 'bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto',
    header: 'px-6 py-4 border-b border-gray-200',
    body: 'px-6 py-4',
    footer: 'px-6 py-4 border-t border-gray-200 flex justify-end space-x-3',
  },
  
  dropdown: {
    container: 'relative inline-block text-left',
    trigger: 'inline-flex items-center p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors duration-200',
    menu: 'absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10',
    item: 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors duration-150',
    separator: 'border-t border-gray-100',
  },
  
  loading: {
    skeleton: 'animate-pulse bg-gray-200 rounded',
    shimmer: 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:400%_100%]',
    spinner: 'animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full',
    overlay: 'absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center',
  },
  
  animations: {
    slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
    fadeIn: 'animate-in fade-in duration-200',
    scaleIn: 'animate-in zoom-in-95 duration-200',
    stagger: {
      delay100: 'animate-in slide-in-from-bottom-4 duration-300 delay-100',
      delay200: 'animate-in slide-in-from-bottom-4 duration-300 delay-200',
    },
  },
  
  spacing: {
    cardGap: 'gap-6',
    elementGap: 'gap-4',
    sectionGap: 'gap-8',
    itemGap: 'gap-2',
  },
  
  accessibility: {
    touchTarget: 'min-h-[44px] min-w-[44px]', // 44px minimum touch target
    focusRing: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    screenReader: 'sr-only',
  },
} as const;

// Card brand configurations
export const cardBrands = {
  visa: {
    name: 'Visa',
    colors: 'from-blue-600 to-blue-800',
    textColor: 'text-white',
    pattern: /^4/,
  },
  mastercard: {
    name: 'Mastercard',
    colors: 'from-red-600 to-orange-600',
    textColor: 'text-white',
    pattern: /^5[1-5]/,
  },
  amex: {
    name: 'American Express',
    colors: 'from-green-600 to-teal-700',
    textColor: 'text-white',
    pattern: /^3[47]/,
  },
  discover: {
    name: 'Discover',
    colors: 'from-orange-500 to-orange-700',
    textColor: 'text-white',
    pattern: /^6(?:011|5)/,
  },
  default: {
    name: 'Card',
    colors: 'from-gray-600 to-gray-800',
    textColor: 'text-white',
    pattern: /.*/,
  },
} as const;

// Utility functions
export const getCardBrand = (cardNumber: string): keyof typeof cardBrands => {
  const number = cardNumber.replace(/\s/g, '');
  
  for (const [brand, config] of Object.entries(cardBrands)) {
    if (config.pattern.test(number)) {
      return brand as keyof typeof cardBrands;
    }
  }
  
  return 'default';
};

export const formatCardNumber = (cardNumber: string): string => {
  const number = cardNumber.replace(/\s/g, '');
  return number.replace(/(.{4})/g, '$1 ').trim();
};

export const maskCardNumber = (cardNumber: string): string => {
  const number = cardNumber.replace(/\s/g, '');
  if (number.length < 4) return number;
  
  const lastFour = number.slice(-4);
  const masked = '•'.repeat(Math.max(0, number.length - 4));
  
  return formatCardNumber(masked + lastFour);
};

export const getCardAnimation = (index: number): string => {
  const animations = [
    paymentTokens.animations.fadeIn,
    paymentTokens.animations.stagger.delay100,
    paymentTokens.animations.stagger.delay200,
  ];
  
  return animations[index % animations.length];
};