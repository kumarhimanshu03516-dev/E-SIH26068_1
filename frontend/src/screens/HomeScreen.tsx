import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../context/store';
import { useWeather } from '../hooks/useWeather';
import { locationService } from '../services/location';
import { GeocodeResult } from '../types';

export const HomeScreen: React.FC = () => {
  const {
    currentWeather,
    forecast,
    location,
    setLocation,
    isOnline,
    language,
  } = useAppStore();
  const { fetchCurrentWeather, fetchForecast } = useWeather();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  // Auto-fetch location on first load
  useEffect(() => {
    if (!location) {
      locationService.getCurrentLocation().then((loc) => {
        if (loc) setLocation(loc);
      });
    }
  }, [location, setLocation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCurrentWeather(), fetchForecast()]);
    setRefreshing(false);
  }, [fetchCurrentWeather, fetchForecast]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Search debounce
  useEffect(() => {
    if (searchDebounce) clearTimeout(searchDebounce);
    if (searchQuery.length >= 2) {
      const timeout = setTimeout(async () => {
        try {
          const { api } = await import('../services/api');
          const res = await api.geocode(searchQuery);
          setSearchResults(res.data ? [res.data] : []);
          setShowSearchResults(true);
        } catch {
          setSearchResults([]);
          setShowSearchResults(false);
        }
      }, 300);
      setSearchDebounce(timeout);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
    return () => {
      if (searchDebounce) clearTimeout(searchDebounce);
    };
  }, [searchQuery]);

  const selectLocation = (result: GeocodeResult) => {
    const loc = { lat: result.lat, lon: result.lon, name: result.name };
    setLocation(loc);
    setSearchQuery(result.name);
    setShowSearchResults(false);
    Keyboard.dismiss();
    handleRefresh();
  };

  const getConditionIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('clear')) return 'sunny';
    if (c.includes('cloud')) return 'cloudy';
    if (c.includes('rain') || c.includes('drizzle')) return 'rainy';
    if (c.includes('thunder')) return 'thunderstorm';
    if (c.includes('snow')) return 'snow';
    if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return 'cloudy';
    return 'partly-sunny';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="partly-sunny" size={28} color="#0ea5e9" />
          <Text style={styles.title}>WeatherGPT</Text>
        </View>
        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="wifi-off" size={14} color="#f97316" />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Location Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={language === 'en' ? 'Search city...' : 'शहर खोजें...'}
            placeholderTextColor="#94a3b8"
            onFocus={() => setShowSearchResults(searchResults.length > 0)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
          />
          {location && (
            <TouchableOpacity style={styles.currentLocBtn} onPress={handleRefresh}>
              <Ionicons name="location" size={20} color="#0ea5e9" />
            </TouchableOpacity>
          )}
        </View>

        {showSearchResults && searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => `${item.lat}-${item.lon}`}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.searchResultItem} onPress={() => selectLocation(item)}>
                <Ionicons name="location" size={20} color="#0ea5e9" />
                <Text style={styles.searchResultText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.searchResultsList}
          />
        )}
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-off" size={16} color="#f97316" />
          <Text style={styles.offlineText}>Offline - Showing cached data</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Weather Card */}
        {currentWeather ? (
          <View style={styles.currentCard}>
            <View style={styles.currentMain}>
              <View style={styles.currentLeft}>
                <Ionicons
                  name={getConditionIcon(currentWeather.condition)}
                  size={80}
                  color="#0ea5e9"
                />
                <Text style={styles.tempText}>{Math.round(currentWeather.temperature)}°C</Text>
                <Text style={styles.conditionText}>{currentWeather.condition}</Text>
                <Text style={styles.feelsText}>
                  {language === 'en' ? 'Feels like' : 'महसूस होता है'} {Math.round(currentWeather.feels_like)}°C
                </Text>
              </View>
              <View style={styles.currentRight}>
                <View style={styles.detailRow}>
                  <Ionicons name="water" size={20} color="#0ea5e9" />
                  <View>
                    <Text style={styles.detailLabel}>{language === 'en' ? 'Humidity' : 'नमी'}</Text>
                    <Text style={styles.detailValue}>{currentWeather.humidity}%</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="wind" size={20} color="#0ea5e9" />
                  <View>
                    <Text style={styles.detailLabel}>{language === 'en' ? 'Wind' : 'हवा'}</Text>
                    <Text style={styles.detailValue}>{currentWeather.wind_speed} m/s</Text>
                  </View>
                </View>
                {location?.name && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color="#0ea5e9" />
                    <View>
                      <Text style={styles.detailLabel}>{language === 'en' ? 'Location' : 'स्थान'}</Text>
                      <Text style={styles.detailValue}>{location.name}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.loadingCard}>
            <Ionicons name="cloud-upload" size={40} color="#0ea5e9" />
            <Text style={styles.loadingText}>
              {language === 'en' ? 'Loading weather...' : 'मौसम लोड हो रहा है...'}
            </Text>
          </View>
        )}

        {/* Forecast */}
        <View style={styles.forecastSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {language === 'en' ? '24-Hour Forecast' : '24 घंटे का पूर्वानुमान'}
            </Text>
            <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
              <Ionicons name="refresh" size={20} color={isOnline ? '#0ea5e9' : '#94a3b8'} spin={refreshing} />
            </TouchableOpacity>
          </View>

          {forecast && forecast.hourly.length > 0 ? (
            <FlatList
              data={forecast.hourly.slice(0, 24)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.dt}
              renderItem={({ item }) => (
                <View style={styles.forecastItem}>
                  <Text style={styles.forecastTime}>
                    {new Date(item.dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons
                    name={getConditionIcon(item.condition)}
                    size={32}
                    color="#0ea5e9"
                  />
                  <Text style={styles.forecastTemp}>{Math.round(item.temperature)}°C</Text>
                  <Text style={styles.forecastRain}>
                    <Ionicons name="water" size={12} color="#0ea5e9" />
                    {item.precipitation_probability}%
                  </Text>
                </View>
              )}
              contentContainerStyle={styles.forecastList}
            />
          ) : (
            <View style={styles.loadingCard}>
              <Ionicons name="cloud-upload" size={32} color="#0ea5e9" />
              <Text style={styles.loadingText}>
                {language === 'en' ? 'Loading forecast...' : 'पूर्वानुमान लोड हो रहा है...'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>
            {language === 'en' ? 'Quick Actions' : 'त्वरित क्रियाएं'}
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
              <Ionicons name="chatbubbles" size={28} color="#fff" />
              <Text style={styles.actionBtnText}>
                {language === 'en' ? 'Chat' : 'चैट'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => {}}>
              <Ionicons name="alert-circle" size={28} color="#fff" />
              <Text style={styles.actionBtnText}>
                {language === 'en' ? 'Alerts' : 'अलर्ट'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22c55e' }]} onPress={() => {}}>
              <Ionicons name="leaf" size={28} color="#fff" />
              <Text style={styles.actionBtnText}>
                {language === 'en' ? 'Advisory' : 'सलाह'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6366f1' }]} onPress={() => {}}>
              <Ionicons name="card" size={28} color="#fff" />
              <Text style={styles.actionBtnText}>
                {language === 'en' ? 'Schemes' : 'योजनाएं'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1e293b',
  },
  currentLocBtn: {
    padding: 4,
  },
  searchResultsList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchResultText: {
    fontSize: 16,
    color: '#1e293b',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  currentCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  currentMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentLeft: {
    alignItems: 'center',
  },
  tempText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  conditionText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  feelsText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  currentRight: {
    gap: 12,
    minWidth: 140,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  forecastSection: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  forecastList: {
    paddingBottom: 8,
    gap: 12,
  },
  forecastItem: {
    width: 70,
    alignItems: 'center',
    gap: 6,
  },
  forecastTime: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  forecastRain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    fontSize: 11,
    color: '#0ea5e9',
  },
  actionsSection: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingBottom: 30,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#0ea5e9',
  },
  actionBtnText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});