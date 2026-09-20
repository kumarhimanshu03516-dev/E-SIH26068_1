import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../context/store';
import { useWeather } from '../hooks/useWeather';
import { SchemeItem } from '../types';

export const SchemesScreen: React.FC = () => {
  const { schemes, isOnline } = useAppStore();
  const { fetchAdvisory } = useWeather(); // This also fetches schemes
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAdvisory();
    setRefreshing(false);
  };

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open link'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="card" size={28} color="#6366f1" />
          <Text style={styles.title}>Government Schemes</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={24} color={isOnline ? '#0ea5e9' : '#94a3b8'} spin={refreshing} />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-off" size={16} color="#f97316" />
          <Text style={styles.offlineText}>Offline - Showing cached schemes</Text>
        </View>
      )}

      {schemes && schemes.length > 0 ? (
        <FlatList
          data={schemes}
          renderItem={({ item }) => <SchemeCard scheme={item} onPress={() => openUrl(item.url)} />}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text" size={64} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Schemes Available</Text>
              <Text style={styles.emptySubtitle}>Check back when online for latest schemes</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.loadingCenter}>
          <Ionicons name="cloud-upload" size={32} color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading schemes...</Text>
        </View>
      )}

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={16} color="#64748b" />
        <Text style={styles.disclaimerText}>
          Information sourced from official government portals. Verify eligibility and apply through official channels.
        </Text>
      </View>
    </SafeAreaView>
  );
};

import { Alert } from 'react-native';

const SchemeCard: React.FC<{ scheme: SchemeItem; onPress: () => void }> = ({ scheme, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.schemeIcon}>
          <Ionicons name="shield-checkmark" size={24} color="#6366f1" />
        </View>
        <View style={styles.schemeTitle}>
          <Text style={styles.name}>{scheme.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </View>

      <Text style={styles.description}>{scheme.description}</Text>

      <View style={styles.eligibility}>
        <Ionicons name="person" size={14} color="#64748b" />
        <Text style={styles.eligibilityText}>
          Eligibility: {scheme.eligibility}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.applyBtn} onPress={onPress}>
          <Ionicons name="open" size={16} color="#fff" />
          <Text style={styles.applyBtnText}>View Details</Text>
        </TouchableOpacity>
        <Text style={styles.urlText}>{scheme.url}</Text>
      </View>
    </TouchableOpacity>
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
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
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
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  schemeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  schemeTitle: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 10,
  },
  eligibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eligibilityText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  urlText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
});