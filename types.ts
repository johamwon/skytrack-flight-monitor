export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureTime: string; // HH:mm
  arrivalTime: string; // HH:mm
  origin: string;
  destination: string;
  price: number;
  platform: 'Ctrip' | 'Fliggy' | 'Qunar';
  url: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
}

export interface PlatformStatus {
  name: 'Ctrip' | 'Fliggy' | 'Qunar';
  isConnected: boolean;
  lastSync: Date | null;
  username?: string;
}

export interface PricePoint {
  time: string;
  Ctrip: number | null;
  Fliggy: number | null;
  Qunar: number | null;
}

export interface PollingConfig {
  isActive: boolean;
  interval: number; // in seconds
}