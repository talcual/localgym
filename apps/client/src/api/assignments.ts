import { api } from './client';
import type { RoutineAssignment } from './types';

export const assignmentsApi = {
  list: (clientId: string) =>
    api
      .get<RoutineAssignment[]>('/assignments', { params: { clientId } })
      .then((r) => r.data),

  create: (data: {
    routineId: string;
    clientId: string;
    startDate: string;
    endDate?: string;
  }) =>
    api.post<RoutineAssignment>('/assignments', data).then((r) => r.data),

  archive: (id: string) =>
    api.delete<{ ok: true }>(`/assignments/${id}`).then((r) => r.data),
};