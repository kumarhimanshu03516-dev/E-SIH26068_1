import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AlertItem } from '../types';

interface AlertCardProps {
  alert: AlertItem;
  onPress?: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  warning: '#f97316',
  info: '#eab308',
  normal: '#22c55e',
};

const SEVERITY_ICONS: Record<string, string> = {
  critical: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
  normal: 'checkmark-circle',
};

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onPress }) => {
  const color = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.normal;
  const icon = SEVERITY_ICONS[alert.severity] || SEVERITY_ICONS.normal;

  return (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.severityBadge}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color }]}>{alert.event}</Text>
          <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.description}>{alert.description}</Text>
      <Text style={styles.action}>{alert.action}</Text>

      {alert.areas.length > 0 && (
        <Text style={styles.areas}>Areas: {alert.areas.join(', ')}</Text>
      )}

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>
          {new Date(alert.starts_at).toLocaleString()} - {new Date(alert.ends_at).toLocaleTimeString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  severityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    lineHeight: 20,
  },
  action: {
    fontSize: 13,
    color: '#0ea5e9',
    fontWeight: '500',
    marginBottom: 4,
  },
  areas: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  timeRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
});