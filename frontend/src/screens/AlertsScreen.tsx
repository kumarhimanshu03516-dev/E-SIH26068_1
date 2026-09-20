import React, { useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../context/store';
import { useWeather } from '../hooks/useWeather';
import { AlertCard } from '../components/AlertCard';
import { notifications } from '../services/notifications';

export const AlertsScreen: React.FC = () => {
  const { alerts, setOnline, isOnline } = useAppStore();
  const { fetchAlerts } = useWeather();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  }, [fetchAlerts]);

  useEffect(() => {
    const listener = notifications.addNotificationListener((notification) => {
      // Handle foreground notification
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const activeAlerts = alerts?.alerts?.filter(a => a.id !== 'normal') || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="alert-circle" size={28} color="#ef4444" />
          <Text style={styles.title}>
            {activeAlerts.length > 0 ? `Alerts (${activeAlerts.length})` : 'Weather Alerts'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={24} color={isOnline ? '#0ea5e9' : '#94a3b8'} spin={refreshing} />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-off" size={16} color="#f97316" />
          <Text style={styles.offlineText}>Offline - Showing cached alerts</Text>
        </View>
      )}

      {activeAlerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          <Text style={styles.emptyTitle}>No Active Alerts</Text>
          <Text style={styles.emptySubtitle}>
            Your area is currently safe. We'll notify you if any weather alerts are issued.
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
            <Ionicons name="refresh" size={20} color="#0ea5e9" />
            <Text style={styles.refreshText}>Pull to Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeAlerts}
          renderItem={({ item }) => <AlertCard alert={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
              <Text style={styles.emptyTitle}>No Active Alerts</Text>
            </View>
          }
        />
      )}

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Severity Levels</Text>
        <View style={styles.legendItems}>
          {[
            { color: '#ef4444', label: 'Critical (Red)', icon: 'alert-circle', desc: 'Immediate danger to life' },
            { color: '#f97316', label: 'Warning (Orange)', icon: 'warning', desc: 'Dangerous conditions likely' },
            { color: '#eab308', label: 'Info (Yellow)', icon: 'information-circle', desc: 'Be aware, monitor updates' },
            { color: '#22c55e', label: 'Normal (Green)', icon: 'checkmark-circle', desc: 'No significant weather risk' },
          ].map((item, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <View>
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
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
    fontSize: 20,
    fontWeight: '700',
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
  offlineText: {
    fontSize: 13,
    color: '#f97316',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: 24,
  },
  refreshText: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  legend: {
    padding: 20,
    paddingBottom: 40,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  legendItems: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 2,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  legendDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});