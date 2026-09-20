import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  onSpeak?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onSpeak }) => {
  const isUser = message.role === 'user';
  const isCached = message.cached;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isUser ? styles.user : styles.assistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="cloud-outline" size={24} color="#0ea5e9" />
        </View>
      )}
      
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
        
        {(!isUser && (message.grounding || isCached)) && (
          <View style={styles.grounding}>
            {isCached && (
              <View style={styles.cachedIndicator}>
                <Ionicons name="wifi-off" size={12} color="#f97316" />
                <Text style={styles.cachedText}>Showing cached data</Text>
              </View>
            )}
            {message.grounding && message.grounding.source && (
              <Text style={styles.sourceText}>
                Source: {message.grounding.source}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.time}>{formatTime(message.timestamp)}</Text>
          {!isUser && onSpeak && (
            <TouchableOpacity style={styles.speakBtn} onPress={onSpeak}>
              <Ionicons name="volume-2" size={18} color="#0ea5e9" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {isUser && (
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#64748b" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  user: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#0ea5e9',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#1e293b',
  },
  grounding: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cachedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cachedText: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '500',
  },
  sourceText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  time: {
    fontSize: 10,
    color: '#94a3b8',
  },
  speakBtn: {
    padding: 4,
  },
});