import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LanguageSelectorProps {
  selected: 'en' | 'hi';
  onChange: (lang: 'en' | 'hi') => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selected, onChange }) => {
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  ];

  return (
    <View style={styles.container}>
      {languages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.option,
            selected === lang.code && styles.selected
          ]}
          onPress={() => onChange(lang.code as 'en' | 'hi')}
        >
          <Text style={styles.flag}>{lang.flag}</Text>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{lang.name}</Text>
            <Text style={styles.nativeName}>{lang.nativeName}</Text>
          </View>
          {selected === lang.code && (
            <Ionicons name="checkmark-circle" size={24} color="#0ea5e9" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  flag: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  nativeName: {
    fontSize: 12,
    color: '#64748b',
  },
});