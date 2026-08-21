import { api } from './client';
import type { Message, MessageThread } from './types';

export const messagesApi = {
  threads: () =>
    api.get<MessageThread[]>('/messages/threads').then((r) => r.data),

  withUser: (userId: string) =>
    api.get<Message[]>(`/messages/threads/${userId}`).then((r) => r.data),

  markRead: (userId: string) =>
    api
      .post<{ updated: number }>(`/messages/threads/${userId}/read`)
      .then((r) => r.data),

  send: (toUserId: string, body: string) =>
    api.post<Message>('/messages', { toUserId, body }).then((r) => r.data),
};