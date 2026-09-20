import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ChatMessage, Location, Language, Role, CropStage, AdvisoryResponse, AlertsResponse, CurrentWeather } from '../types';
import { storage } from '../services/storage';

interface AppState {
  // User preferences
  language: Language;
  role: Role;
  cropStage: CropStage;
  location: Location | null;
  emergencyContact: string;
  
  // Chat
  messages: ChatMessage[];
  isLoading: boolean;
  
  // Data
  currentWeather: CurrentWeather | null;
  alerts: AlertsResponse | null;
  advisory: AdvisoryResponse | null;
  
  // Offline
  isOnline: boolean;
  lastSync: number | null;
  
  // Actions
  setLanguage: (lang: Language) => void;
  setRole: (role: Role) => void;
  setCropStage: (stage: CropStage) => void;
  setLocation: (loc: Location | null) => void;
  setEmergencyContact: (contact: string) => void;
  
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  
  setCurrentWeather: (weather: CurrentWeather | null) => void;
  setAlerts: (alerts: AlertsResponse | null) => void;
  setAdvisory: (advisory: AdvisoryResponse | null) => void;
  
  setOnline: (online: boolean) => void;
  setLastSync: (time: number) => void;
  
  loadFromStorage: () => Promise<void>;
  clearChat: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'en',
      role: 'general',
      cropStage: 'sowing',
      location: null,
      emergencyContact: '',
      
      messages: [],
      isLoading: false,
      
      currentWeather: null,
      alerts: null,
      advisory: null,
      
      isOnline: true,
      lastSync: null,
      
      setLanguage: (language) => {
        set({ language });
        storage.setPref('language', language);
      },
      
      setRole: (role) => {
        set({ role });
        storage.setPref('role', role);
      },
      
      setCropStage: (cropStage) => {
        set({ cropStage });
        storage.setPref('cropStage', cropStage);
      },
      
      setLocation: (location) => {
        set({ location });
        if (location) storage.saveLocation(location);
      },
      
      setEmergencyContact: (emergencyContact) => {
        set({ emergencyContact });
        storage.setPref('emergencyContact', emergencyContact);
      },
      
      addMessage: (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
        storage.saveMessage({
          id: message.id,
          role: message.role,
          content: message.content,
          language: message.language,
          timestamp: message.timestamp.getTime(),
          grounding: message.grounding,
          cached: message.cached,
        });
      },
      
      setMessages: (messages) => set({ messages }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setCurrentWeather: (currentWeather) => set({ currentWeather }),
      setAlerts: (alerts) => set({ alerts }),
      setAdvisory: (advisory) => set({ advisory }),
      
      setOnline: (isOnline) => set({ isOnline }),
      setLastSync: (lastSync) => set({ lastSync }),
      
      loadFromStorage: async () => {
        const [lang, role, cropStage, contact, loc, history] = await Promise.all([
          storage.getPref('language'),
          storage.getPref('role'),
          storage.getPref('cropStage'),
          storage.getPref('emergencyContact'),
          storage.getLocation(),
          storage.getChatHistory(50),
        ]);
        
        set({
          language: (lang as Language) || 'en',
          role: (role as Role) || 'general',
          cropStage: (cropStage as CropStage) || 'sowing',
          emergencyContact: contact || '',
          location: loc,
          messages: (history || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            language: m.language,
            timestamp: new Date(m.timestamp),
            grounding: m.grounding ? JSON.parse(m.grounding) : undefined,
            cached: Boolean(m.cached),
          })).reverse(),
        });
      },
      
      clearChat: () => {
        set({ messages: [] });
        storage.clearChatHistory();
      },
    }),
    {
      name: 'weathergpt-store',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const value = await storage.getPref(name);
          return value || null;
        },
        setItem: async (name, value) => {
          await storage.setPref(name, value);
        },
        removeItem: async (name) => {
          await storage.setPref(name, '');
        },
      })),
      partialize: (state) => ({
        language: state.language,
        role: state.role,
        cropStage: state.cropStage,
        emergencyContact: state.emergencyContact,
      }),
    }
  )
);