export type PlatformName = 'Ctrip' | 'Fliggy' | 'Qunar';

export interface Hotel {
  id: string;
  name: string;
  brand?: string;
  location: string;
  rating: number;
  platform: PlatformName;
  roomType: string;
  policy: string;
  price: number;
  currency: 'CNY';
  availability: 'Available' | 'Limited' | 'SoldOut';
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  url: string;
  lastUpdated: string;
  tags?: string[];
  priceCalendar?: { date: string; price: number }[];
  predictedTrend?: 'up' | 'down' | 'stable';
  historicLow?: number;
}

export interface SearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  starRating: 'Any' | '3+' | '4+' | '5';
  brand: string;
}

export interface PlatformStatus {
  name: PlatformName;
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

export interface MonitoringSettings {
  priceThreshold: number;
  dropPercentage: number;
  notifyOnAvailability: boolean;
  anomalySensitivity: 'low' | 'medium' | 'high';
}

export interface AlertEvent {
  id: string;
  time: string;
  type: 'PriceDrop' | 'Threshold' | 'Availability' | 'Anomaly';
  message: string;
  platform: PlatformName;
  hotelName: string;
  price?: number;
}

export interface CollectorTask {
  id: string;
  platform: PlatformName;
  status: 'queued' | 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt?: string;
  steps: string[];
  retryCount: number;
}

export interface CollectorMetrics {
  successRate: number;
  retryCount: number;
  failureCount: number;
  lastError?: string;
  lastRun?: string;
  sampleReplayQueue: number;
}

export interface SessionPoolStats {
  total: number;
  active: number;
  idle: number;
}

export interface CompliancePolicy {
  platform: PlatformName;
  loginRequired: boolean;
  cookieScope: string;
  rateLimitPerMinute: number;
  antiBotMitigation: string[];
  fallback: string;
}

export interface CollectorReport {
  tasks: CollectorTask[];
  metrics: CollectorMetrics;
  sessionPool: SessionPoolStats;
  compliance: CompliancePolicy[];
  notes: string[];
}

export interface CollectorResult {
  hotels: Hotel[];
  report: CollectorReport;
}
