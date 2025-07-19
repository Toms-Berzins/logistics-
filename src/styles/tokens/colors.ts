export const logisticsColors = {
  // Primary brand colors
  primary: {
    50: '#F0F7FF',
    100: '#E0EFFE',
    200: '#B9DFFD',
    300: '#7CC7FB',
    400: '#36ADF7',
    500: '#0C8CE8',
    600: '#006DC6',
    700: '#1C4E80', // Main brand color
    800: '#1A3A5C',
    900: '#1C2E3D',
    950: '#111B2A',
  },
  
  // Status colors for drivers
  status: {
    active: {
      bg: '#1C4E80',
      text: '#FFFFFF',
      border: '#0C8CE8',
      pulse: 'rgba(28, 78, 128, 0.3)',
    },
    idle: {
      bg: '#FFB400',
      text: '#FFFFFF', 
      border: '#FF9500',
      pulse: 'rgba(255, 180, 0, 0.3)',
    },
    offline: {
      bg: '#DC3545',
      text: '#FFFFFF',
      border: '#C82333',
      pulse: 'rgba(220, 53, 69, 0.3)',
    },
    break: {
      bg: '#6C757D',
      text: '#FFFFFF',
      border: '#5A6268',
      pulse: 'rgba(108, 117, 125, 0.3)',
    },
  },
  
  // Vehicle type colors
  vehicle: {
    van: '#17A2B8',
    truck: '#28A745',
    car: '#6F42C1',
    motorcycle: '#FD7E14',
  },
  
  // Map specific colors
  map: {
    cluster: {
      small: '#007CBF',
      medium: '#0056B3',
      large: '#003D82',
    },
    geofence: {
      delivery: {
        stroke: '#28A745',
        fill: 'rgba(40, 167, 69, 0.1)',
      },
      warehouse: {
        stroke: '#17A2B8',
        fill: 'rgba(23, 162, 184, 0.1)',
      },
      restricted: {
        stroke: '#DC3545',
        fill: 'rgba(220, 53, 69, 0.1)',
      },
      customer: {
        stroke: '#6F42C1',
        fill: 'rgba(111, 66, 193, 0.1)',
      },
    },
    controls: {
      bg: '#FFFFFF',
      border: '#DEE2E6',
      shadow: 'rgba(0, 0, 0, 0.1)',
      hover: '#F8F9FA',
      active: '#E9ECEF',
    },
  },
  
  // Semantic colors
  semantic: {
    success: '#28A745',
    warning: '#FFC107',
    error: '#DC3545',
    info: '#17A2B8',
  },
  
  // Neutral colors
  neutral: {
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
    950: '#16181B',
  },
} as const;

export type LogisticsColor = keyof typeof logisticsColors;
export type StatusColor = keyof typeof logisticsColors.status;
export type VehicleColor = keyof typeof logisticsColors.vehicle;