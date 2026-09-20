import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WeatherCardProps {
  weather: {
    temperature: number;
    condition: string;
    humidity: number;
    wind_speed: number;
    icon: string;
    cached?: boolean;
    fetched_at?: string;
  };
  locationName?: string;
  onRefresh?: () => void;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ 
  weather, 
  locationName, 
  onRefresh 
}) => {
  const getWeatherIcon = (icon: string) => {
    const iconMap: Record<string, string> = {
      '01d': 'sunny',
      '01n': 'moon',
      '02d': 'partly-sunny',
      '02n': 'cloudy-night',
      '03d': 'cloud',
      '03n': 'cloud',
      '04d': 'cloud-outline',
      '04n': 'cloud-outline',
      '09d': 'rainy',
      '09n': 'rainy',
      '10d': 'rainy',
      '10n': 'rainy',
      '11d': 'thunderstorm',
      '11n': 'thunderstorm',
      '13d': 'snow',
      '13n': 'snow',
      '50d': 'cloud-outline',
      '50n': 'cloud-outline',
    };
    return iconMap[icon] || 'help';
  };

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    const hours = Math.floor(diff / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="#64748b" />
          <Text style={styles.locationText}>{locationName || 'Current Location'}</Text>
        </View>
        {weather.cached && (
          <View style={styles.cachedBadge}>
            <Ionicons name="wifi-off" size={12} color="#f97316" />
            <Text style={styles.cachedText}>Cached • {formatTimeAgo(weather.fetched_at)}</Text>
          </View>
        )}
      </View>

      <View style={styles.main}>
        <View style={styles.tempSection}>
          <Ionicons name={getWeatherIcon(weather.icon)} size={64} color="#0ea5e9" />
          <Text style={styles.temperature}>{Math.round(weather.temperature)}°C</Text>
        </View>
        
        <View style={styles.details}>
          <Text style={styles.condition}>{weather.condition}</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="water" size={20} color="#0ea5e9" />
              <Text style={styles.detailLabel}>Humidity</Text>
              <Text style={styles.detailValue}>{weather.humidity}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="wind" size={20} color="#0ea5e9" />
              <Text style={styles.detailLabel}>Wind</Text>
              <Text style={styles.detailValue}>{weather.wind_speed} m/s</Text>
            </View>
          </View>
        </View>
      </View>

      {onRefresh && (
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#0ea5e9" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cachedText: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '500',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tempSection: {
    alignItems: 'center',
  },
  temperature: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 56,
  },
  details: {
    flex: 1,
  },
  condition: {
    fontSize: 18,
    color: '#475569',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  refreshText: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
  },
});