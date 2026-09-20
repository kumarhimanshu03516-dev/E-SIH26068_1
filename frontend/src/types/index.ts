export type Language = 'en' | 'hi';

export type Role = 'farmer' | 'fisherman' | 'general';

export type CropStage = 'sowing' | 'growing' | 'harvest';

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'normal';

export interface Location {
  lat: number;
  lon: number;
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: Language;
  timestamp: Date;
  grounding?: GroundingData;
  cached?: boolean;
}

export interface GroundingData {
  temperature?: number;
  humidity?: number;
  precipitation_probability?: number;
  wind_speed?: number;
  condition?: string;
  alert_severity?: string;
  source: string;
}

export interface CurrentWeather {
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  icon: string;
  fetched_at: string;
  cached: boolean;
}

export interface ForecastHourly {
  dt: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  precipitation_probability: number;
  condition: string;
  icon: string;
}

export interface ForecastResponse {
  hourly: ForecastHourly[];
  fetched_at: string;
  cached: boolean;
}

export interface AlertItem {
  id: string;
  event: string;
  severity: AlertSeverity;
  color: string;
  description: string;
  areas: string[];
  starts_at: string;
  ends_at: string;
  action: string;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  fetched_at: string;
  cached: boolean;
}

export interface AdvisoryAction {
  action: string;
  priority: string;
}

export interface AdvisoryResponse {
  role: Role;
  crop_stage?: CropStage;
  advisory: string;
  actions: AdvisoryAction[];
  based_on: Record<string, any>;
  fetched_at: string;
}

export interface SchemeItem {
  name: string;
  description: string;
  url: string;
  eligibility: string;
}

export interface SchemesResponse {
  schemes: SchemeItem[];
}

export interface TranslateResponse {
  translated_text: string;
  cached: boolean;
}

export interface UserPreferences {
  language: Language;
  role: Role;
  location?: Location;
  emergencyContact?: string;
  pushToken?: string;
}