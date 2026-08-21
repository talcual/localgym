import { api } from './client';
import type {
  InstructorClient,
  InstructorInvitation,
  InviteResult,
} from './types';

export const instructorsApi = {
  invite: (email: string, kind: 'EMAIL' | 'CODE' = 'EMAIL') =>
    api
      .post<InviteResult>('/instructors/invite', { email, kind })
      .then((r) => r.data),

  listInvitations: () =>
    api
      .get<InstructorInvitation[]>('/instructors/invitations')
      .then((r) => r.data),

  listClients: () =>
    api.get<InstructorClient[]>('/instructors/clients').then((r) => r.data),

  revokeClient: (clientId: string) =>
    api.delete<{ ok: true }>(`/instructors/clients/${clientId}`).then((r) => r.data),

  acceptInvitation: (token: string) =>
    api
      .post<InstructorClient>('/instructors/accept', { token })
      .then((r) => r.data),

  pendingForMe: () =>
    api
      .get<InstructorInvitation[]>('/instructors/pending-for-me')
      .then((r) => r.data),
};