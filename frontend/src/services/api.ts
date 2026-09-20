import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ChatMessage, GroundingData, CurrentWeather, ForecastResponse, AlertsResponse, AdvisoryResponse, SchemesResponse, GeocodeResult, TranslateResponse, Location } from '../types';

const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:8000'  // Android emulator localhost
  : 'https://your-production-api.com';

class ApiService {
  private client: AxiosInstance;
  private offlineQueue: Array<() => Promise<void>> = [];
  private isOnline = true;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Add auth token if needed
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (!error.response) {
          // Network error - queue for retry
          this.isOnline = false;
          return Promise.reject(new Error('OFFLINE'));
        }
        return Promise.reject(error);
      }
    );

    // Listen for online/offline
    if (Platform.OS !== 'web') {
      const NetInfo = require('@react-native-community/netinfo').default;
      NetInfo.addEventListener((state) => {
        this.isOnline = state.isConnected ?? true;
        if (this.isOnline) {
          this.flushOfflineQueue();
        }
      });
    }
  }

  private async flushOfflineQueue() {
    while (this.offlineQueue.length > 0) {
      const task = this.offlineQueue.shift();
      if (task) {
        try {
          await task();
        } catch (e) {
          // Re-queue on failure
          this.offlineQueue.unshift(task);
          break;
        }
      }
    }
  }

  async chat(message: string, language: 'en' | 'hi', location?: Location, role: 'farmer' | 'fisherman' | 'general' = 'general') {
    return this.client.post<ChatMessage>('/api/chat', {
      query: message,
      language,
      location,
      role,
    });
  }

  async translate(text: string, source: 'en' | 'hi', target: 'en' | 'hi') {
    return this.client.post<TranslateResponse>('/api/translate', {
      text,
      source,
      target,
    });
  }

  async getCurrentWeather(lat: number, lon: number) {
    return this.client.get<CurrentWeather>('/api/weather/current', { params: { lat, lon } });
  }

  async getForecast(lat: number, lon: number) {
    return this.client.get<ForecastResponse>('/api/weather/forecast', { params: { lat, lon } });
  }

  async geocode(city: string) {
    return this.client.get<GeocodeResult>('/api/weather/geocode', { params: { city } });
  }

  async getAlerts(lat: number, lon: number) {
    return this.client.get<AlertsResponse>('/api/alerts/active', { params: { lat, lon } });
  }

  async subscribePush(token: string, location: Location, language: 'en' | 'hi') {
    return this.client.post('/api/alerts/subscribe', { token, location, language });
  }

  async getFarmerAdvisory(lat: number, lon: number, cropStage: string = 'sowing') {
    return this.client.get<AdvisoryResponse>('/api/advisory/farmer', { params: { lat, lon, crop_stage: cropStage } });
  }

  async getFishermanAdvisory(lat: number, lon: number) {
    return this.client.get<AdvisoryResponse>('/api/advisory/fisherman', { params: { lat, lon } });
  }

  async getGeneralAdvisory(lat: number, lon: number) {
    return this.client.get<AdvisoryResponse>('/api/advisory/general', { params: { lat, lon } });
  }

  async getSchemes() {
    return this.client.get<SchemesResponse>('/api/advisory/schemes');
  }

  async healthCheck() {
    return this.client.get('/api/health');
  }

  // Offline queue methods
  queueWhenOnline(task: () => Promise<void>) {
    if (this.isOnline) {
      return task();
    }
    this.offlineQueue.push(task);
    return Promise.resolve();
  }

  getOnlineStatus() {
    return this.isOnline;
  }
}

export const api = new ApiService();