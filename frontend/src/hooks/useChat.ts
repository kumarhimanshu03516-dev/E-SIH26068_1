import { useCallback, useRef } from 'react';
import { useAppStore } from '../context/store';
import { api, voice, storage } from '../services';
import { ChatMessage, GroundingData } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useChat() {
  const { 
    language, 
    role, 
    location, 
    messages, 
    addMessage, 
    setLoading,
    setOnline 
  } = useAppStore();

  const isProcessing = useRef(false);

  const sendMessage = useCallback(async (text: string) => {
    if (isProcessing.current || !text.trim()) return;
    isProcessing.current = true;
    setLoading(true);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text.trim(),
      language,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    try {
      const response = await api.chat(text.trim(), language, location || undefined, role);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.data.answer,
        language: response.data.language,
        timestamp: new Date(response.data.timestamp),
        grounding: response.data.grounding,
        cached: response.data.cached,
      };
      addMessage(assistantMessage);

      // Speak the response
      await voice.speak(response.data.answer, response.data.language as 'en' | 'hi');

      setOnline(true);
    } catch (error: any) {
      console.error('Chat error:', error);
      
      let errorMessage = 'Unable to get response. Please try again.';
      if (error.message === 'OFFLINE' || !error.response) {
        errorMessage = 'You appear to be offline. Showing cached data if available.';
        setOnline(false);
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: errorMessage,
        language,
        timestamp: new Date(),
      };
      addMessage(errorMsg);
    } finally {
      setLoading(false);
      isProcessing.current = false;
    }
  }, [language, role, location, addMessage, setLoading, setOnline]);

  const sendVoiceMessage = useCallback(() => {
    return new Promise<void>((resolve) => {
      voice.startListening(
        language,
        (text) => {
          sendMessage(text).then(resolve);
        },
        (error) => {
          console.error('Voice input error:', error);
          resolve();
        }
      );
    });
  }, [language, sendMessage]);

  return { sendMessage, sendVoiceMessage, isProcessing: isProcessing.current };
}