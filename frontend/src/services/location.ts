import * as Location from 'expo-location';
import { Location as LocationType } from '../types';
import { storage } from './storage';

export class LocationService {
  private watchId: Location.LocationSubscription | null = null;

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getCurrentLocation(): Promise<LocationType | null> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return null;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 300000,
        timeout: 10000,
      });

      const result: LocationType = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };

      // Try to get address
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (addresses.length > 0) {
          const addr = addresses[0];
          result.name = [addr.city, addr.region, addr.country].filter(Boolean).join(', ');
        }
      } catch {}

      await storage.saveLocation(result);
      return result;
    } catch (error) {
      console.error('Failed to get location:', error);
      return null;
    }
  }

  async watchLocation(
    onUpdate: (location: LocationType) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      onError('Location permission denied');
      return;
    }

    this.watchId = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 300000,
        distanceInterval: 1000,
      },
      (location) => {
        const result: LocationType = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        };
        onUpdate(result);
      }
    );
  }

  stopWatching() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  async getSavedLocation(): Promise<LocationType | null> {
    return storage.getLocation();
  }
}

export const locationService = new LocationService();