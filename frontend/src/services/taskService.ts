import api from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'VIEWER';
  plan: 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
}

export const tasksApi = {
  getAll: () => api.get('/tasks'),
  getOne: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

export const calendarApi = {
  getEvents: () => api.get('/calendar/events'),
  autoSchedule: () => api.post('/calendar/auto-schedule'),
  syncCalendar: (provider: string) => api.post(`/calendar/sync/${provider}`),
  addEvent: (event: any) => api.post('/calendar/events', event),
  deleteEvent: (eventId: string) => api.delete(`/calendar/events/${eventId}`),
};
