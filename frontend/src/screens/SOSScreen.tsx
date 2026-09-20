import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  Linking,
  Platform,
  Vibration,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../context/store';
import { locationService } from '../services/location';

const EMERGENCY_NUMBERS = {
  national: '112',
  disaster: '1078',
  ambulance: '102',
  police: '100',
  fire: '101',
};

export const SOSScreen: React.FC = () => {
  const { emergencyContact, setEmergencyContact, location } = useAppStore();
  const [contact, setContact] = useState(emergencyContact);
  const [sosActive, setSosActive] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    setContact(emergencyContact);
  }, [emergencyContact]);

  const triggerSOS = async () => {
    setSosActive(true);
    Vibration.vibrate([0, 500, 200, 500]);

    // Get current location
    setGettingLocation(true);
    const currentLoc = await locationService.getCurrentLocation();
    setGettingLocation(false);

    const locationText = currentLoc 
      ? `https://maps.google.com/?q=${currentLoc.lat},${currentLoc.lon}`
      : 'Location unavailable';

    const message = `🚨 EMERGENCY SOS from WeatherGPT\n\nI need help! My location: ${locationText}\n\nPlease contact emergency services immediately.`;

    // Try to send SMS
    try {
      const smsUrl = `sms:${contact || EMERGENCY_NUMBERS.national}?body=${encodeURIComponent(message)}`;
      await Linking.openURL(smsUrl);
    } catch (e) {
      // SMS failed, try call
    }

    // Also try to call
    setTimeout(async () => {
      try {
        await Linking.openURL(`tel:${EMERGENCY_NUMBERS.national}`);
      } catch (e) {
        Alert.alert('Emergency', 'Unable to auto-dial. Please manually call 112');
      }
    }, 2000);

    // Show confirmation
    Alert.alert(
      '🚨 SOS ACTIVATED',
      `Emergency services (${EMERGENCY_NUMBERS.national}) contacted.\nLocation shared: ${currentLoc ? 'Yes' : 'No'}\n\nStay on the line with the operator.`,
      [{ text: 'OK', onPress: () => setSosActive(false) }],
      { cancelable: false }
    );
  };

  const callNumber = async (number: string, label: string) => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert('Error', `Unable to call ${label}. Please dial ${number} manually.`);
    }
  };

  const sendSMS = async (number: string) => {
    const message = `🚨 Emergency from WeatherGPT. Location: ${location ? `https://maps.google.com/?q=${location.lat},${location.lon}` : 'Unavailable'}`;
    try {
      await Linking.openURL(`sms:${number}?body=${encodeURIComponent(message)}`);
    } catch {
      Alert.alert('Error', 'Unable to open SMS. Please send manually.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="medical" size={28} color="#ef4444" />
        <Text style={styles.title}>Emergency SOS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!sosActive ? (
          <>
            <TouchableOpacity 
              style={[styles.sosButton, sosActive && styles.sosActive]}
              onPress={triggerSOS}
              activeOpacity={0.9}
            >
              <View style={styles.sosInner}>
                <Ionicons name="alert-circle" size={64} color="#fff" />
                <Text style={styles.sosText}>TAP FOR EMERGENCY SOS</Text>
                <Text style={styles.sosSubtext}>Calls 112 • Shares Location • Sends SMS</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
              <View style={styles.contactInput}>
                <Ionicons name="person" size={22} color="#64748b" />
                <TextInput
                  style={styles.input}
                  value={contact}
                  onChangeText={(text) => setContact(text)}
                  placeholder="Emergency contact number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={() => { setEmergencyContact(contact); Alert.alert('Saved', 'Emergency contact updated'); }}
              >
                <Text style={styles.saveBtnText}>Save Contact</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>National Helplines</Text>
              <View style={styles.helplineGrid}>
                {[
                  { label: 'National Emergency', number: EMERGENCY_NUMBERS.national, icon: 'call', color: '#ef4444' },
                  { label: 'Disaster Helpline', number: EMERGENCY_NUMBERS.disaster, icon: 'warning', color: '#f97316' },
                  { label: 'Ambulance', number: EMERGENCY_NUMBERS.ambulance, icon: 'medical', color: '#0ea5e9' },
                  { label: 'Police', number: EMERGENCY_NUMBERS.police, icon: 'shield', color: '#6366f1' },
                  { label: 'Fire', number: EMERGENCY_NUMBERS.fire, icon: 'flame', color: '#ef4444' },
                ].map((item, i) => (
                  <TouchableOpacity key={i} style={styles.helplineCard} onPress={() => callNumber(item.number, item.label)}>
                    <View style={[styles.helplineIcon, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon} size={24} color={item.color} />
                    </View>
                    <View>
                      <Text style={styles.helplineLabel}>{item.label}</Text>
                      <Text style={[styles.helplineNumber, { color: item.color }]}>{item.number}</Text>
                    </View>
                    <Ionicons name="call" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Location</Text>
              <View style={styles.locationCard}>
                <Ionicons name="location" size={24} color="#0ea5e9" />
                <View>
                  {location ? (
                    <>
                      <Text style={styles.locationText}>{location.name || 'Current Location'}</Text>
                      <Text style={styles.locationCoords}>
                        {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.locationText}>Tap to get location</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.getLocationBtn} 
                  onPress={async () => {
                    setGettingLocation(true);
                    const loc = await locationService.getCurrentLocation();
                    setGettingLocation(false);
                  }}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <Ionicons name="refresh" size={20} color="#0ea5e9" spin />
                  ) : (
                    <Ionicons name="refresh" size={20} color="#0ea5e9" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>In an Emergency:</Text>
              <View style={styles.instructionList}>
                {[
                  '1. Tap the red SOS button above',
                  '2. Stay on the line with 112 operator',
                  '3. Share your exact location',
                  '4. Follow operator instructions',
                  '5. Move to safe location if possible',
                ].map((step, i) => (
                  <Text key={i} style={styles.instructionItem}>{step}</Text>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.sosActiveView}>
            <Ionicons name="pulse" size={80} color="#ef4444" />
            <Text style={styles.sosActiveTitle}>SOS ACTIVE</Text>
            <Text style={styles.sosActiveText}>Emergency services have been alerted</Text>
            <Text style={styles.sosActiveText}>Stay on the line with the operator</Text>
            <TouchableOpacity style={styles.sosCancelBtn} onPress={() => setSosActive(false)}>
              <Text style={styles.sosCancelText}>I'm Safe - Cancel SOS</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef2f2',
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
    color: '#ef4444',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sosButton: {
    backgroundColor: '#ef4444',
    borderRadius: 24,
    padding: 30,
    marginBottom: 24,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  sosActive: {
    animation: 'pulse 1.5s infinite',
  },
  sosInner: {
    alignItems: 'center',
  },
  sosText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    letterSpacing: 1,
  },
  sosSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  contactInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 12,
  },
  saveBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  helplineGrid: {
    gap: 10,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  helplineIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helplineLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  helplineNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  locationCoords: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  getLocationBtn: {
    marginLeft: 'auto',
    padding: 8,
  },
  instructions: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  instructionList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  sosActiveView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  sosActiveTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ef4444',
    marginTop: 16,
  },
  sosActiveText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  sosCancelBtn: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#22c55e',
    borderRadius: 12,
  },
  sosCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});