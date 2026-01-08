import axios from 'axios';

const API_BASE_URL = '';

export interface NotificationItem {
  id: number;
  time: string;
  action: string;
  model: string;
  details: string;
}

/**
 * 获取系统通知列表
 */
export const getSystemNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/notifications`);
    if (response.data.status === 'ok') {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return [];
  }
};
