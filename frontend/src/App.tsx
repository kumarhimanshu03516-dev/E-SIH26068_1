import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from './context/store';
import { storage, notifications, locationService, voice } from './services';
import { ChatScreen } from './screens/ChatScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { AdvisoryScreen } from './screens/AdvisoryScreen';
import { MapScreen } from './screens/MapScreen';
import { SOSScreen } from './screens/SOSScreen';
import { SchemesScreen } from './screens/SchemesScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabBarIcon: React.FC<{ name: string; focused: boolean; color: string }> = ({ name, focused, color }) => (
  <Ionicons name={name} size={26} color={color} />
);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused, color }) => <TabBarIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ focused, color }) => <TabBarIcon name={focused ? 'alert-circle' : 'alert-circle-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Advisory"
        component={AdvisoryScreen}
        options={{
          tabBarLabel: 'Advisory',
          tabBarIcon: ({ focused, color }) => <TabBarIcon name={focused ? 'leaf' : 'leaf-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused, color }) => <TabBarIcon name={focused ? 'map' : 'map-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="SOS"
        component={SOSScreen}
        options={{
          tabBarLabel: 'SOS',
          tabBarIcon: ({ focused, color }) => <TabBarIcon name={focused ? 'medical' : 'medical-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Schemes"
        component={SchemesScreen}
        options={{
          tabBarLabel: 'Schemes',
          tabBarIcon: ({ focused, color }) => <TabBarIcon name={focused ? 'card' : 'card-outline'} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused, color }) => <TabBarIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const loadFromStorage = useAppStore((state) => state.loadFromStorage);
  const setOnline = useAppStore((state) => state.setOnline);

  React.useEffect(() => {
    const initialize = async () => {
      await storage.init();
      await loadFromStorage();

      // Request permissions
      await notifications.registerForPushNotifications();
      await locationService.requestPermission();
      await voice.isListening(); // Check availability

      // Subscribe to push if location available
      const loc = await storage.getLocation();
      if (loc && notifications.getPushToken()) {
        await notifications.subscribeToAlerts(loc, useAppStore.getState().language);
      }

      // Check online status
      const NetInfo = require('@react-native-community/netinfo').default;
      const state = await NetInfo.fetch();
      setOnline(state.isConnected ?? true);
    };

    initialize();
  }, [loadFromStorage, setOnline]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}