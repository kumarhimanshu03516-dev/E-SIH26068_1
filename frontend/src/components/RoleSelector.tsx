import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Role = 'farmer' | 'fisherman' | 'general';

interface RoleSelectorProps {
  selected: Role;
  onChange: (role: Role) => void;
}

const ROLES = [
  { 
    value: 'farmer' as Role, 
    label: 'Farmer', 
    hindi: 'किसान', 
    icon: 'leaf',
    description: 'Crop advice, sowing/harvest timing'
  },
  { 
    value: 'fisherman' as Role, 
    label: 'Fisherman', 
    hindi: 'मछुआरा', 
    icon: 'fish',
    description: 'Sea conditions, safety alerts'
  },
  { 
    value: 'general' as Role, 
    label: 'General', 
    hindi: 'सामान्य', 
    icon: 'person',
    description: 'Daily weather, health alerts'
  },
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selected, onChange }) => {
  return (
    <View style={styles.container}>
      {ROLES.map((role) => (
        <TouchableOpacity
          key={role.value}
          style={[
            styles.option,
            selected === role.value && styles.selected
          ]}
          onPress={() => onChange(role.value)}
        >
          <View style={[
            styles.iconWrapper,
            selected === role.value && styles.iconWrapperSelected
          ]}>
            <Ionicons name={role.icon} size={24} color={selected === role.value ? '#fff' : '#0ea5e9'} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{role.label}</Text>
              <Text style={styles.hindi}>({role.hindi})</Text>
            </View>
            <Text style={styles.description}>{role.description}</Text>
          </View>
          {selected === role.value && (
            <Ionicons name="checkmark-circle" size={24} color="#0ea5e9" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperSelected: {
    backgroundColor: '#0ea5e9',
  },
  textContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  hindi: {
    fontSize: 14,
    color: '#64748b',
  },
  description: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});