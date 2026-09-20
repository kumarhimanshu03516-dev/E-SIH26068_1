import * as Speech from 'expo-speech';
import * as SpeechRecognition from 'expo-speech-recognition';
import { Platform } from 'react-native';

export interface VoiceService {
  speak: (text: string, language?: 'en' | 'hi') => Promise<void>;
  stopSpeaking: () => Promise<void>;
  startListening: (language?: 'en' | 'hi', onResult: (text: string) => void, onError: (error: string) => void) => Promise<void>;
  stopListening: () => Promise<void>;
  isListening: () => boolean;
  isSpeaking: () => boolean;
}

class VoiceServiceImpl implements VoiceService {
  private listening = false;
  private speaking = false;

  async speak(text: string, language: 'en' | 'hi' = 'en') {
    if (this.speaking) {
      await this.stopSpeaking();
    }
    this.speaking = true;
    return new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        language: language === 'hi' ? 'hi-IN' : 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          this.speaking = false;
          resolve();
        },
        onError: (error) => {
          this.speaking = false;
          reject(error);
        },
      });
    });
  }

  async stopSpeaking() {
    await Speech.stop();
    this.speaking = false;
  }

  async startListening(
    language: 'en' | 'hi' = 'en',
    onResult: (text: string) => void,
    onError: (error: string) => void
  ) {
    if (this.listening) return;

    const available = await SpeechRecognition.isAvailableAsync();
    if (!available) {
      onError('Speech recognition not available on this device');
      return;
    }

    const permission = await SpeechRecognition.requestPermissionsAsync();
    if (!permission.granted) {
      onError('Microphone permission denied');
      return;
    }

    this.listening = true;

    try {
      await SpeechRecognition.startListeningAsync({
        language: language === 'hi' ? 'hi-IN' : 'en-US',
        partialResults: true,
        onResult: ({ isFinal, transcript }) => {
          if (isFinal && transcript.trim()) {
            onResult(transcript.trim());
            this.listening = false;
          }
        },
        onError: (error) => {
          this.listening = false;
          onError(error.message || 'Speech recognition error');
        },
      });
    } catch (error) {
      this.listening = false;
      onError('Failed to start listening');
    }
  }

  async stopListening() {
    if (this.listening) {
      await SpeechRecognition.stopListeningAsync();
      this.listening = false;
    }
  }

  isListening(): boolean {
    return this.listening;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }
}

export const voice = new VoiceServiceImpl();