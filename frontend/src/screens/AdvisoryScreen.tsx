import React, { useEffect, useCallback, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../context/store';
import { useWeather } from '../hooks/useWeather';
import { RoleSelector } from '../components/RoleSelector';
import { AdvisoryResponse, AdvisoryAction } from '../types';

export const AdvisoryScreen: React.FC = () => {
  const { 
    role, 
    setRole, 
    cropStage, 
    setCropStage, 
    advisory, 
    isOnline,
    location 
  } = useAppStore();
  const { fetchAdvisory } = useWeather();
  const [refreshing, setRefreshing] = React.useState(false);
  const [showCropStage, setShowCropStage] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAdvisory();
    setRefreshing(false);
  }, [fetchAdvisory]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const CROP_STAGES = [
    { value: 'sowing', label: 'Sowing', hindi: 'बुआई', icon: 'seed' },
    { value: 'growing', label: 'Growing', hindi: 'बढ़वार', icon: 'leaf' },
    { value: 'harvest', label: 'Harvest', hindi: 'कटाई', icon: 'cut' },
  ];

  if (!advisory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="leaf" size={28} color="#22c55e" />
            <Text style={styles.title}>Advisory</Text>
          </View>
        </View>
        <View style={styles.loadingCenter}>
          <Ionicons name="cloud-upload" size={32} color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading advisory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="leaf" size={28} color="#22c55e" />
          <Text style={styles.title}>Advisory</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={24} color={isOnline ? '#0ea5e9' : '#94a3b8'} spin={refreshing} />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-off" size={16} color="#f97316" />
          <Text style={styles.offlineText}>Offline - Showing cached advisory</Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <RoleSelector selected={role} onChange={setRole} />

        {role === 'farmer' && (
          <TouchableOpacity style={styles.cropStageBtn} onPress={() => setShowCropStage(true)}>
            <View style={styles.cropStageBtnContent}>
              <Ionicons name="leaf" size={20} color="#0ea5e9" />
              <View>
                <Text style={styles.cropStageLabel}>Crop Stage</Text>
                <Text style={styles.cropStageValue}>
                  {CROP_STAGES.find(s => s.value === cropStage)?.label || cropStage}
                  {' '}
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.advisoryCard}>
          <View style={styles.advisoryHeader}>
            <Ionicons name="document-text" size={24} color="#22c55e" />
            <Text style={styles.advisoryTitle}>
              {role === 'farmer' ? 'Farming Advisory' : role === 'fisherman' ? 'Fishing Advisory' : 'General Advisory'}
            </Text>
          </View>
          
          <Text style={styles.advisoryText}>{advisory.advisory}</Text>

          {advisory.based_on && Object.keys(advisory.based_on).length > 0 && (
            <View style={styles.basisSection}>
              <Text style={styles.basisTitle}>Based on:</Text>
              {Object.entries(advisory.based_on).map(([key, value]) => (
                <View key={key} style={styles.basisItem}>
                  <Text style={styles.basisKey}>{key.replace(/_/g, ' ')}:</Text>
                  <Text style={styles.basisValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          )}

          {advisory.actions.length > 0 && (
            <View style={styles.actionsSection}>
              <Text style={styles.actionsTitle}>Recommended Actions</Text>
              {advisory.actions.map((action: AdvisoryAction, i: number) => (
                <TouchableOpacity key={i} style={[styles.actionCard, { borderLeftColor: getPriorityColor(action.priority) }]}>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionText}>{action.action}</Text>
                    <View style={styles.actionMeta}>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(action.priority) }]}>
                        <Text style={styles.priorityText}>{action.priority.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.schemesSection}>
          <Text style={styles.sectionTitle}>Government Schemes</Text>
          <Text style={styles.sectionSubtitle}>Support for weather-related crop loss</Text>
          <TouchableOpacity style={styles.schemesBtn} onPress={() => Alert.alert('Schemes', 'View full list in Schemes tab')}>
            <Text style={styles.schemesBtnText}>View All Schemes →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showCropStage && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Crop Stage</Text>
              <TouchableOpacity onPress={() => setShowCropStage(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {CROP_STAGES.map((stage) => (
              <TouchableOpacity
                key={stage.value}
                style={[styles.stageOption, cropStage === stage.value && styles.stageOptionSelected]}
                onPress={() => { setCropStage(stage.value as any); setShowCropStage(false); }}
              >
                <Ionicons name={stage.icon} size={22} color={cropStage === stage.value ? '#fff' : '#0ea5e9'} />
                <View style={styles.stageText}>
                  <Text style={[styles.stageLabel, cropStage === stage.value && { color: '#fff' }]}>{stage.label}</Text>
                  <Text style={[styles.stageHindi, cropStage === stage.value && { color: 'rgba(255,255,255,0.8)' }]}>({stage.hindi})</Text>
                </View>
                {cropStage === stage.value && <Ionicons name="checkmark" size={22} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
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
  scrollView: {
    flex: 1,
  },
  cropStageBtn: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  cropStageBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  cropStageLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cropStageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  advisoryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  advisoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  advisoryText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 16,
  },
  basisSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    marginBottom: 16,
  },
  basisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  basisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  basisKey: {
    fontSize: 13,
    color: '#94a3b8',
  },
  basisValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  actionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  schemesSection: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  schemesBtn: {
    paddingVertical: 14,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    alignItems: 'center',
  },
  schemesBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  stageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  stageOptionSelected: {
    backgroundColor: '#0ea5e9',
  },
  stageText: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  stageHindi: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
});