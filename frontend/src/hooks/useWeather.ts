import { useEffect, useCallback } from 'react';
import { useAppStore } from '../context/store';
import { api, storage } from '../services';
import { CurrentWeather, ForecastResponse, AlertsResponse, AdvisoryResponse } from '../types';

export function useWeather() {
  const { location, setCurrentWeather, setAlerts, setAdvisory, setLastSync, role, cropStage, language, isOnline } = useAppStore();

  const fetchCurrentWeather = useCallback(async () => {
    if (!location) return;
    
    // Try cache first
    const cacheKey = `current:${location.lat}:${location.lon}`;
    const cached = await storage.getWeatherCache(cacheKey);
    if (cached) {
      setCurrentWeather(cached);
    }

    if (!isOnline) return;

    try {
      const response = await api.getCurrentWeather(location.lat, location.lon);
      setCurrentWeather(response.data);
      await storage.setWeatherCache(cacheKey, response.data, 30 * 60 * 1000);
      setLastSync(Date.now());
    } catch (error) {
      console.error('Failed to fetch current weather:', error);
    }
  }, [location, setCurrentWeather, setLastSync, isOnline]);

  const fetchForecast = useCallback(async () => {
    if (!location) return;
    
    const cacheKey = `forecast:${location.lat}:${location.lon}`;
    const cached = await storage.getWeatherCache(cacheKey);
    if (cached) {
      // Forecast is stored but we don't have a setter for it in store yet
    }

    if (!isOnline) return;

    try {
      const response = await api.getForecast(location.lat, location.lon);
      await storage.setWeatherCache(cacheKey, response.data, 2 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Failed to fetch forecast:', error);
    }
  }, [location, isOnline]);

  const fetchAlerts = useCallback(async () => {
    if (!location) return;
    
    const cached = await storage.getAlertsCache();
    if (cached) {
      setAlerts(cached);
    }

    if (!isOnline) return;

    try {
      const response = await api.getAlerts(location.lat, location.lon);
      setAlerts(response.data);
      await storage.setAlertsCache(response.data, 15 * 60 * 1000);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  }, [location, setAlerts, isOnline]);

  const fetchAdvisory = useCallback(async () => {
    if (!location) return;
    
    const cacheKey = `${role}:${location.lat}:${location.lon}:${cropStage}`;
    const cached = await storage.getAdvisoryCache(cacheKey);
    if (cached) {
      setAdvisory(cached);
    }

    if (!isOnline) return;

    try {
      let response;
      if (role === 'farmer') {
        response = await api.getFarmerAdvisory(location.lat, location.lon, cropStage);
      } else if (role === 'fisherman') {
        response = await api.getFishermanAdvisory(location.lat, location.lon);
      } else {
        response = await api.getGeneralAdvisory(location.lat, location.lon);
      }
      setAdvisory(response.data);
      await storage.setAdvisoryCache(cacheKey, response.data, 6 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Failed to fetch advisory:', error);
    }
  }, [location, role, cropStage, setAdvisory, isOnline]);

  useEffect(() => {
    fetchCurrentWeather();
    fetchForecast();
    fetchAlerts();
    fetchAdvisory();
  }, [fetchCurrentWeather, fetchForecast, fetchAlerts, fetchAdvisory]);

  return {
    fetchCurrentWeather,
    fetchForecast,
    fetchAlerts,
    fetchAdvisory,
  };
}