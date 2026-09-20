import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';
import { AlertItem } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private pushToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id',
      });
      this.pushToken = tokenData.data;
      console.log('Push token:', this.pushToken);
      return this.pushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async subscribeToAlerts(location: { lat: number; lon: number }, language: 'en' | 'hi') {
    if (this.pushToken) {
      try {
        await api.subscribePush(this.pushToken, location, language);
      } catch (error) {
        console.error('Failed to subscribe to push:', error);
      }
    }
  }

  async showLocalAlert(alert: AlertItem) {
    const severityColors = {
      critical: '#ef4444',
      warning: '#f97316',
      info: '#eab308',
      normal: '#22c55e',
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${this.getSeverityEmoji(alert.severity)} ${alert.severity.toUpperCase()}: ${alert.event}`,
        body: `${alert.description}. ${alert.action}`,
        data: { alertId: alert.id },
        color: severityColors[alert.severity],
      },
      trigger: null,
    });
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟠';
      case 'info': return '🟡';
      default: return '🟢';
    }
  }

  addNotificationListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  getPushToken(): string | null {
    return this.pushToken;
  }
}

export const notifications = new NotificationService();