import { apiFetch } from './api';

export type MeetingAttendee = {
  user_id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
};

export type MeetingDetail = {
  meeting_id: string;
  project_id: string;
  project_name: string;
  meeting_title: string;
  meeting_time: string;
  duration_minutes: number | null;
  recurrence: 'none' | 'weekly' | 'biweekly';
  attendees: MeetingAttendee[];
};

export async function getMeeting(meetingId: string): Promise<MeetingDetail> {
  const res = await apiFetch(`/api/v1/meetings/${meetingId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch meeting: ${res.status}`);
  }
  return res.json() as Promise<MeetingDetail>;
}

export async function updateMeeting(
  meetingId: string,
  data: {
    meeting_title?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    recurrence?: 'none' | 'weekly' | 'biweekly';
    attendee_user_ids?: string[];
  }
): Promise<MeetingDetail> {
  const res = await apiFetch(`/api/v1/meetings/${meetingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update meeting: ${res.status}`);
  }
  return res.json() as Promise<MeetingDetail>;
}
