import * as Notifications from 'expo-notifications';

let lastNotificationAt = 0;

export const initNotifications = async (): Promise<void> => {
  await Notifications.requestPermissionsAsync();
};

export const notifyPrivacyAction = async (
  message: string,
  throttleMs = 15_000
): Promise<void> => {
  const now = Date.now();
  if (now - lastNotificationAt < throttleMs) {
    return;
  }

  lastNotificationAt = now;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'VPU Privacy',
      body: message,
      sound: false
    },
    trigger: null
  });
};
