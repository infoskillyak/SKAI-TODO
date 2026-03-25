import api from './api';
import { tasksApi } from './taskService';

export { tasksApi };

export const authApi = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => {
    localStorage.removeItem('skai_token');
    localStorage.removeItem('skai_user');
  },

  // Account management
  deleteAccount: (password: string) => api.delete('/auth/account', { data: { password } }),
  updatePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/password', { currentPassword, newPassword }),

  // Email verification
  requestEmailVerification: () => api.post('/auth/verify-email/request'),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),

  // OAuth integrations
  connectOAuth: (provider: string, accessToken: string, refreshToken?: string) =>
    api.post(`/auth/oauth/${provider}/connect`, { accessToken, refreshToken }),
  disconnectOAuth: (provider: string) =>
    api.delete(`/auth/oauth/${provider}/disconnect`),
  getConnectedProviders: () => api.get('/auth/oauth/connected'),

  // Calendar
  syncCalendar: (provider: string) => api.post(`/calendar/sync/${provider}`),
  addCalendarEvent: (event: { title: string; startAt: string; endAt: string; provider?: string }) =>
    api.post('/calendar/events', event),
  deleteCalendarEvent: (eventId: string) => api.delete(`/calendar/events/${eventId}`),
};
