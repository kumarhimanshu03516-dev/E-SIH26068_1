import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../context/store';
import { useWeather } from '../hooks/useWeather';
import { AlertsResponse } from '../types';

export const MapScreen: React.FC = () => {
  const { location, alerts } = useAppStore();
  const { fetchCurrentWeather } = useWeather();
  const [region, setRegion] = useState({
    latitude: location?.lat || 28.6139,
    longitude: location?.lon || 77.2090,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [showUserLocation, setShowUserLocation] = useState(true);

  useEffect(() => {
    if (location) {
      setRegion(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lon,
      }));
    }
  }, [location]);

  const alertMarkers = alerts?.alerts
    ?.filter(a => a.id !== 'normal' && a.areas.length > 0)
    .map((alert, index) => ({
      ...alert,
      // Approximate coordinates for demo - in production use geocoding
      latitude: region.latitude + (Math.random() - 0.5) * 0.1,
      longitude: region.longitude + (Math.random() - 0.5) * 0.1,
    })) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="map" size={28} color="#0ea5e9" />
          <Text style={styles.title}>Weather Map</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.mapBtn} onPress={() => setShowUserLocation(true)}>
            <Ionicons name="locate" size={24} color={showUserLocation ? '#0ea5e9' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn} onPress={() => setRegion(prev => ({ ...prev, latitudeDelta: prev.latitudeDelta * 0.5, longitudeDelta: prev.longitudeDelta * 0.5 }))}>
            <Ionicons name="add" size={24} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn} onPress={() => setRegion(prev => ({ ...prev, latitudeDelta: prev.latitudeDelta * 2, longitudeDelta: prev.longitudeDelta * 2 }))}>
            <Ionicons name="remove" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={true}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        mapType="standard"
      >
        {location && (
          <Marker
            coordinate={{ latitude: location.lat, longitude: location.lon }}
            title="Your Location"
            description={location.name || 'Current position'}
            pinColor="#0ea5e9"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>Your Location</Text>
                <Text style={styles.calloutText}>{location.name || 'Current position'}</Text>
              </View>
            </Callout>
          </Marker>
        )}

        {alertMarkers.map((alert, index) => (
          <Marker
            key={alert.id}
            coordinate={{ latitude: alert.latitude, longitude: alert.longitude }}
            title={alert.event}
            description={alert.severity.toUpperCase()}
            pinColor={getSeverityColor(alert.severity)}
          >
            <Callout>
              <View style={styles.callout}>
                <View style={styles.calloutSeverity}>
                  <View style={[styles.severityDot, { backgroundColor: getSeverityColor(alert.severity) }]} />
                  <Text style={styles.calloutSeverityText}>{alert.severity.toUpperCase()}</Text>
                </View>
                <Text style={styles.calloutTitle}>{alert.event}</Text>
                <Text style={styles.calloutText}>{alert.description}</Text>
                <Text style={styles.calloutAction}>{alert.action}</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {location && alertMarkers.length > 0 && (
          <Polyline
            coordinates={[
              { latitude: location.lat, longitude: location.lon },
              ...alertMarkers.map(a => ({ latitude: a.latitude, longitude: a.longitude }))
            ]}
            strokeColor="#e2e8f0"
            strokeWidth={2}
            strokeColors={alertMarkers.map(a => getSeverityColor(a.severity))}
            geodesic={true}
          />
        )}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Alert Markers</Text>
        <View style={styles.legendItems}>
          {[
            { color: '#ef4444', label: 'Critical', icon: 'alert-circle' },
            { color: '#f97316', label: 'Warning', icon: 'warning' },
            { color: '#eab308', label: 'Info', icon: 'information-circle' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.legendItem}>
              <View style={[styles.legendPin, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={14} color="#fff" />
              </View>
              <Text style={styles.legendLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'warning': return '#f97316';
    case 'info': return '#eab308';
    default: return '#22c55e';
  }
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  callout: {
    padding: 4,
    minWidth: 200,
  },
  calloutSeverity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calloutSeverityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#1e293b',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  calloutText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  calloutAction: {
    fontSize: 11,
    color: '#0ea5e9',
    fontWeight: '500',
    marginTop: 4,
  },
  legend: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
  },
});