import React, { useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../context/store';
import { useChat } from '../hooks/useChat';
import { useWeather } from '../hooks/useWeather';
import { MessageBubble } from '../components/MessageBubble';
import { LanguageSelector } from '../components/LanguageSelector';
import { voice } from '../services';
import { ChatMessage } from '../types';

export const ChatScreen: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    messages, 
    isLoading, 
    location,
    currentWeather,
    alerts,
  } = useAppStore();
  const { sendMessage, sendVoiceMessage } = useChat();
  const { fetchCurrentWeather, fetchAlerts } = useWeather();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [inputText, setInputText] = React.useState('');
  const [showLanguageSelector, setShowLanguageSelector] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = useCallback(() => {
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  }, [inputText, sendMessage]);

  const handleVoiceInput = useCallback(async () => {
    await sendVoiceMessage();
  }, [sendVoiceMessage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCurrentWeather(), fetchAlerts()]);
    setRefreshing(false);
  }, [fetchCurrentWeather, fetchAlerts]);

  const speakLastMessage = useCallback(async () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      await voice.speak(lastAssistant.content, lastAssistant.language as 'en' | 'hi');
    }
  }, [messages]);

  const getWelcomeMessage = () => {
    if (language === 'hi') {
      return "नमस्ते! मैं WeatherGPT हूँ। मौसम, अलर्ट, या खेती/मछली पकड़ने की सलाह के लिए पूछें।";
    }
    return "Hello! I'm WeatherGPT. Ask me about weather, alerts, or farming/fishing advice.";
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="partly-sunny" size={28} color="#0ea5e9" />
          <Text style={styles.title}>WeatherGPT</Text>
        </View>
        <TouchableOpacity 
          style={styles.langBtn} 
          onPress={() => setShowLanguageSelector(!showLanguageSelector)}
        >
          <Text style={styles.langText}>{language === 'en' ? 'EN' : 'हि'}</Text>
          <Ionicons name="chevron-down" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {showLanguageSelector && (
        <View style={styles.langSelectorOverlay}>
          <LanguageSelector selected={language} onChange={(lang) => {
            setLanguage(lang);
            setShowLanguageSelector(false);
          }} />
        </View>
      )}

      {messages.length === 0 && (
        <View style={styles.welcomeContainer}>
          <Ionicons name="chatbubbles" size={64} color="#94a3b8" />
          <Text style={styles.welcomeText}>{getWelcomeMessage()}</Text>
          <View style={styles.suggestions}>
            <Text style={styles.suggestionLabel}>
              {language === 'en' ? 'Try asking:' : 'पूछें:'}
            </Text>
            <View style={styles.suggestionChips}>
              {language === 'en' ? [
                "What's the weather today?",
                "Any alerts for my area?",
                "Should I sow seeds today?",
                "Is it safe to go fishing?",
              ] : [
                "आज मौसम कैसा है?",
                "मेरे क्षेत्र में कोई अलर्ट?",
                "आज बुआई करनी चाहिए?",
                "मछली पकड़ना सुरक्षित है?",
              ].map((text, i) => (
                <TouchableOpacity key={i} style={styles.chip} onPress={() => sendMessage(text)}>
                  <Text style={styles.chipText}>{text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSpeak={() => voice.speak(message.content, message.language as 'en' | 'hi')}
          />
        ))}
        {isLoading && (
          <View style={styles.loading}>
            <Ionicons name="cloud-upload" size={24} color="#0ea5e9" />
            <Text style={styles.loadingText}>
              {language === 'en' ? 'Thinking...' : 'सोच रहा हूँ...'}
            </Text>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputWrapper}>
          <TouchableOpacity 
            style={styles.voiceBtn} 
            onPress={handleVoiceInput}
            disabled={isLoading}
          >
            <Ionicons name="mic" size={24} color={isLoading ? '#94a3b8' : '#0ea5e9'} />
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            placeholder={language === 'en' ? 'Ask about weather...' : 'मौसम के बारे में पूछें...'}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
            disabled={isLoading}
          />
          
          <TouchableOpacity 
            style={styles.sendBtn} 
            onPress={handleSend}
            disabled={isLoading || !inputText.trim()}
          >
            <Ionicons name="send" size={24} color={inputText.trim() ? '#0ea5e9' : '#94a3b8'} />
          </TouchableOpacity>
        </View>

        {(currentWeather || alerts?.alerts?.[0]?.id !== 'normal') && (
          <View style={styles.contextBar}>
            {currentWeather && (
              <View style={styles.contextItem}>
                <Ionicons name="thermometer" size={14} color="#0ea5e9" />
                <Text style={styles.contextText}>
                  {Math.round(currentWeather.temperature)}°C • {currentWeather.condition}
                </Text>
              </View>
            )}
            {alerts?.alerts?.[0]?.id !== 'normal' && (
              <View style={styles.contextItem}>
                <Ionicons name="warning" size={14} color="#f97316" />
                <Text style={[styles.contextText, { color: '#f97316' }]}>
                  {alerts.alerts[0].event} Alert
                </Text>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
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
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  langSelectorOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 100,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 26,
  },
  suggestions: {
    marginTop: 24,
    width: '100%',
  },
  suggestionLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 10,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    color: '#0ea5e9',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  voiceBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1e293b',
    maxHeight: 120,
  },
  sendBtn: {
    padding: 8,
  },
  contextBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  contextText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
});