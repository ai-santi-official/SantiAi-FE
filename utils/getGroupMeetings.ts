export type GroupMeeting = {
  meeting_id: string;
  project_id: string;
  project_name: string;
  meeting_title: string;
  meeting_time: string;
  recurrence: string;
  duration_minutes: number | null;
};

export type GroupMeetingsResponse = {
  line_group_id: string;
  meetings: GroupMeeting[];
};

import { apiFetch } from './api';

export async function getGroupMeetings(groupId?: string): Promise<GroupMeetingsResponse> {
  if (!groupId) {
    return { line_group_id: "", meetings: [] };
  }

  const res = await apiFetch(`/api/v1/line-groups/${groupId}/meetings`);

  if (!res.ok) {
    throw new Error(`Failed to fetch group meetings: ${res.status}`);
  }

  return res.json() as Promise<GroupMeetingsResponse>;
}
