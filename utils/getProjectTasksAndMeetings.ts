import { apiFetch } from './api';
import type { PlanMember } from './getPlanProposal';

export type ProjectTask = {
  task_id: string;
  project_id: string;
  task_title: string;
  task_description: string;
  task_status: 'todo' | 'doing' | 'done';
  due_date: string | null;
  finished_at: string | null;
  creation_method: string;
  created_at: string;
  assignees: {
    user_id: string;
    line_user_id: string;
    display_name: string | null;
    picture_url: string | null;
  }[];
};

export type ProjectMeeting = {
  meeting_id: string;
  project_id: string;
  meeting_title: string;
  meeting_time: string;
  duration_minutes: number | null;
  recurrence: 'none' | 'weekly' | 'biweekly';
  attendees: {
    user_id: string;
    line_user_id: string;
    display_name: string | null;
    picture_url: string | null;
  }[];
};

export async function getProjectTasks(projectId: string): Promise<ProjectTask[]> {
  const res = await apiFetch(`/api/v1/projects/${projectId}/tasks`);
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  const data = await res.json();
  return data.tasks;
}

export async function getProjectMeetings(projectId: string): Promise<ProjectMeeting[]> {
  const res = await apiFetch(`/api/v1/projects/${projectId}/meetings`);
  if (!res.ok) throw new Error(`Failed to fetch meetings: ${res.status}`);
  const data = await res.json();
  return data.meetings;
}

export async function getProjectMembers(projectId: string): Promise<PlanMember[]> {
  const res = await apiFetch(`/api/v1/projects/${projectId}/members`);
  if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
  const data = await res.json();
  return data.members;
}

export async function updateTaskStatus(taskId: string, status: 'todo' | 'doing' | 'done') {
  const res = await apiFetch(`/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);
  return res.json();
}

export async function updateTaskFull(taskId: string, data: {
  title?: string;
  description?: string;
  status?: 'todo' | 'doing' | 'done';
  due_date?: string | null;
  assignee_user_ids?: string[];
}) {
  const res = await apiFetch(`/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);
  return res.json();
}

export async function updateMeetingFull(meetingId: string, data: {
  meeting_title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  recurrence?: 'none' | 'weekly' | 'biweekly';
  attendee_user_ids?: string[];
}) {
  const res = await apiFetch(`/api/v1/meetings/${meetingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update meeting: ${res.status}`);
  return res.json();
}

export async function createTaskApi(projectId: string, data: {
  title: string;
  description?: string;
  due_date?: string;
  assignee_user_ids?: string[];
}): Promise<ProjectTask> {
  const res = await apiFetch(`/api/v1/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
  return res.json() as Promise<ProjectTask>;
}

export async function deleteTaskApi(taskId: string) {
  const res = await apiFetch(`/api/v1/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
}

export async function deleteMeetingApi(meetingId: string) {
  const res = await apiFetch(`/api/v1/meetings/${meetingId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete meeting: ${res.status}`);
}

export async function revertApprovedPlanVersion(projectId: string, planVersionId: string) {
  const res = await apiFetch(`/api/v1/projects/${projectId}/plan-versions/${planVersionId}/revert-approved`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to revert: ${res.status}`);
  return res.json();
}
