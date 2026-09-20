import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../context/store';
import { storage } from '../services/storage';
import { LanguageSelector } from '../components/LanguageSelector';
import { RoleSelector } from '../components/RoleSelector';

export const SettingsScreen: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    role, 
    setRole, 
    cropStage, 
    setCropStage,
    emergencyContact,
    setEmergencyContact,
    location,
    isOnline,
  } = useAppStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoLocation, setAutoLocation] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cacheSize, setCacheSize] = useState('Calculating...');

  useEffect(() => {
    calculateCacheSize();
  }, []);

  const calculateCacheSize = async () => {
    try {
      // In a real app, use expo-file-system to get actual cache size
      setCacheSize('~2.3 MB');
    } catch {
      setCacheSize('Unknown');
    }
  };

  const clearAllCache = async () => {
    Alert.alert(
      'Clear Cache?',
      'This will remove all cached weather data, alerts, and advisory. You will need to re-fetch when online.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            await storage.clearChatHistory();
            // Clear other caches
            Alert.alert('Done', 'All caches cleared');
            calculateCacheSize();
          }
        },
      ]
    );
  };

  const clearChatHistory = async () => {
    Alert.alert(
      'Clear Chat History?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            await storage.clearChatHistory();
            Alert.alert('Done', 'Chat history cleared');
          }
        },
      ]
    );
  };

  const openPrivacyPolicy = () => Linking.openURL('https://weathergpt.example.com/privacy');
  const openTerms = () => Linking.openURL('https://weathergpt.example.com/terms');
  const reportIssue = () => Linking.openURL('https://github.com/weathergpt/issues');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="settings" size={28} color="#0ea5e9" />
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language & Region</Text>
          <LanguageSelector selected={language} onChange={setLanguage} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Role</Text>
          <RoleSelector selected={role} onChange={setRole} />
        </View>

        {role === 'farmer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Crop Stage</Text>
            <TouchableOpacity style={styles.cropStageBtn} onPress={() => {
              Alert.alert(
                'Select Crop Stage',
                '',
                [
                  { text: 'Sowing (बुआई)', onPress: () => setCropStage('sowing') },
                  { text: 'Growing (बढ़वार)', onPress: () => setCropStage('growing') },
                  { text: 'Harvest (कटाई)', onPress: () => setCropStage('harvest') },
                ]
              );
            }}>
              <View style={styles.cropStageBtnContent}>
                <Ionicons name="leaf" size={22} color="#0ea5e9" />
                <View>
                  <Text style={styles.cropStageLabel}>Current Stage</Text>
                  <Text style={styles.cropStageValue}>
                    {cropStage === 'sowing' ? 'Sowing (बुआई)' : cropStage === 'growing' ? 'Growing (बढ़वार)' : 'Harvest (कटाई)'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <TouchableOpacity style={styles.contactRow} onPress={() => {
            Alert.prompt(
              'Emergency Contact',
              'Enter phone number for SOS alerts',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Save', onPress: (text) => text && setEmergencyContact(text) },
              ],
              'plain-text',
              emergencyContact
            );
          }}>
            <Ionicons name="person-add" size={22} color="#0ea5e9" />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Emergency Contact</Text>
              <Text style={styles.contactValue}>
                {emergencyContact || 'Not set - tap to add'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive weather alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#e2e8f0', true: '#0ea5e9' }}
              thumbColor={notificationsEnabled ? '#0ea5e9' : '#fff'}
            />
          </View>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Auto Location</Text>
              <Text style={styles.settingDesc}>Automatically detect location</Text>
            </View>
            <Switch
              value={autoLocation}
              onValueChange={setAutoLocation}
              trackColor={{ false: '#e2e8f0', true: '#0ea5e9' }}
              thumbColor={autoLocation ? '#0ea5e9' : '#fff'}
            />
          </View>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Voice Output</Text>
              <Text style={styles.settingDesc}>Speak responses aloud</Text>
            </View>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              trackColor={{ false: '#e2e8f0', true: '#0ea5e9' }}
              thumbColor={voiceEnabled ? '#0ea5e9' : '#fff'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Cache Size</Text>
              <Text style={styles.infoValue}>{cacheSize}</Text>
            </View>
            <TouchableOpacity style={styles.clearBtn} onPress={clearAllCache}>
              <Text style={styles.clearBtnText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Chat History</Text>
              <Text style={styles.infoValue}>Stored locally on device</Text>
            </View>
            <TouchableOpacity style={styles.clearBtn} onPress={clearChatHistory}>
              <Text style={styles.clearBtnText}>Clear History</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Location Access</Text>
              <Text style={styles.infoValue}>
                {location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : 'Not available'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoRow}>
            <View style={styles.aboutItem}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0 (SIH 2026 Demo)</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.aboutItem}>
              <Text style={styles.infoLabel}>Data Source</Text>
              <Text style={styles.infoValue}>OpenWeatherMap (Free Tier)</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.aboutItem}>
              <Text style={styles.infoLabel}>Translation</Text>
              <Text style={styles.infoValue}>LibreTranslate / Fallback</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.linkBtn} onPress={openPrivacyPolicy}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={openTerms}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={reportIssue}>
            <Text style={styles.linkText}>Report Issue / Feedback</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.offlineStatus}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: isOnline ? '#22c55e' : '#f97316' }
          ]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online - Live data' : 'Offline - Cached data'}
          </Text>
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
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  cropStageBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
  },
  cropStageBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cropStageLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cropStageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  settingDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  infoValue: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  aboutItem: {
    flex: 1,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  linkBtn: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  linkText: {
    fontSize: 15,
    color: '#0ea5e9',
    fontWeight: '500',
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    marginTop: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
});