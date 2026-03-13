import { apiFetch } from './api';

export type PlanMember = {
  user_id: string;
  display_name: string | null;
  picture_url: string | null;
};

export type PlanTask = {
  id: string;
  title: string;
  description: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
  assigned_to: string[];
  status: "todo" | "doing" | "done";
};

export type PlanMeeting = {
  id: string;
  title: string;
  datetime: string; // ISO datetime
  duration_minutes: number;
  recurrence: "none" | "weekly" | "biweekly";
  participants: string[];
  notes: string;
};

export type PlanVersion = {
  id: string;
  version: number;
  ai_reasoning: string;
  tasks: PlanTask[];
  meetings: PlanMeeting[];
};

export type Project = {
  id: string;
  name: string;
  deadline: string; // ISO datetime
  detail: string;
  deliverables: string;
  members: PlanMember[];
};

export type PlanProposalResponse = {
  project: Project;
  plan_version: PlanVersion;
};

export async function getPlanProposal(projectId: string): Promise<PlanProposalResponse> {
  const [reviewRes, membersRes] = await Promise.all([
    apiFetch(`/api/v1/projects/${projectId}/calendar/review`),
    apiFetch(`/api/v1/projects/${projectId}/members`),
  ]);

  if (!reviewRes.ok) throw new Error(`Failed to fetch calendar review: ${reviewRes.status}`);
  if (!membersRes.ok) throw new Error(`Failed to fetch project members: ${membersRes.status}`);

  const { project, plan_version } = await reviewRes.json();
  const { members } = await membersRes.json();

  const snapshot = plan_version.snapshot ?? {};

  // Normalize tasks — handle both AI format (start_time/end_time/assignee_user_ids)
  // and FE format (start_date/end_date/assigned_to)
  const rawTasks: any[] = snapshot.tasks ?? [];
  const tasks: PlanTask[] = rawTasks.map((t: any, i: number) => ({
    id: t.id ?? `task-${i}`,
    title: t.title ?? '',
    description: t.description ?? '',
    start_date: t.start_date ?? (t.start_time ? t.start_time.slice(0, 10) : ''),
    end_date: t.end_date ?? (t.end_time ? t.end_time.slice(0, 10) : ''),
    assigned_to: t.assigned_to ?? t.assignee_user_ids ?? [],
    status: t.status ?? 'todo',
  }));

  // Normalize meetings — handle both AI format (meeting_title/meeting_time/attendee_user_ids)
  // and FE format (title/datetime/participants)
  const rawMeetings: any[] = snapshot.meetings ?? [];
  const meetings: PlanMeeting[] = rawMeetings.map((m: any, i: number) => ({
    id: m.id ?? `meeting-${i}`,
    title: m.title ?? m.meeting_title ?? '',
    datetime: m.datetime ?? m.meeting_time ?? '',
    duration_minutes: m.duration_minutes ?? 60,
    recurrence: m.recurrence ?? 'none',
    participants: m.participants ?? m.attendee_user_ids ?? [],
    notes: m.notes ?? '',
  }));

  return {
    project: {
      id: project.project_id,
      name: project.project_name ?? '',
      deadline: project.final_due_date ?? '',
      detail: project.project_detail ?? '',
      deliverables: project.final_deliverable ?? '',
      members: members ?? [],
    },
    plan_version: {
      id: plan_version.plan_version_id,
      version: plan_version.version_number,
      ai_reasoning: snapshot.ai_reasoning ?? '',
      tasks,
      meetings,
    },
  };
}
