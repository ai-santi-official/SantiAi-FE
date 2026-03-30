import { apiFetch } from './api';

export type PlanMember = {
  user_id: string;
  line_user_id?: string;
  display_name: string | null;
  picture_url: string | null;
};

export type PlanTask = {
  id: string;
  title: string;
  description: string;
  start_date: string; // "YYYY-MM-DD" or ISO datetime
  end_date: string;   // "YYYY-MM-DD" or ISO datetime
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

  // Build a name→user_id lookup from project members so we can resolve
  // assignee/attendee names coming from n8n into user_ids the FE expects.
  const memberList: PlanMember[] = members ?? [];
  const nameToId = new Map<string, string>();
  for (const m of memberList) {
    if (m.display_name) nameToId.set(m.display_name.toLowerCase(), m.user_id);
  }
  const resolveIds = (arr: string[]): string[] =>
    arr.map((v) => nameToId.get(v.toLowerCase()) ?? v);

  // Normalize tasks — handle n8n format (task_id/task_title/task_description/due_date/task_assignees),
  // AI format (start_time/end_time/assignee_user_ids), and FE format (id/title/start_date/end_date/assigned_to)
  const rawTasks: any[] = snapshot.tasks ?? [];
  const tasks: PlanTask[] = rawTasks.map((t: any, i: number) => ({
    id: t.id ?? t.task_id ?? `task-${i}`,
    title: t.title ?? t.task_title ?? '',
    description: t.description ?? t.task_description ?? '',
    start_date: t.start_date ?? t.start_time ?? '',
    end_date: t.end_date ?? t.due_date ?? t.end_time ?? '',
    assigned_to: resolveIds(t.assigned_to ?? t.assignee_user_ids ?? t.task_assignees ?? []),
    status: t.status ?? 'todo',
  }));

  // Normalize meetings — handle n8n format (meeting_id/meeting_title/meeting_detail/meeting_date+start_time+end_time/meeting_attendees),
  // AI format (meeting_time/attendee_user_ids), and FE format (id/title/datetime/participants)
  const rawMeetings: any[] = snapshot.meetings ?? [];
  const meetings: PlanMeeting[] = rawMeetings.map((m: any, i: number) => {
    // Compute datetime: prefer existing datetime/meeting_time, else build from meeting_date + start_time
    let datetime = m.datetime ?? m.meeting_time ?? '';
    if (!datetime && m.meeting_date) {
      datetime = m.start_time
        ? `${m.meeting_date}T${m.start_time}:00`
        : `${m.meeting_date}T00:00:00`;
    }

    // Compute duration from start_time/end_time if duration_minutes is absent
    let duration = m.duration_minutes;
    if (duration == null && m.start_time && m.end_time) {
      const [sh, sm] = m.start_time.split(':').map(Number);
      const [eh, em] = m.end_time.split(':').map(Number);
      duration = (eh * 60 + em) - (sh * 60 + sm);
      if (duration <= 0) duration = 60;
    }

    return {
      id: m.id ?? m.meeting_id ?? `meeting-${i}`,
      title: m.title ?? m.meeting_title ?? '',
      datetime,
      duration_minutes: duration ?? 60,
      recurrence: m.recurrence ?? 'none',
      participants: resolveIds(m.participants ?? m.attendee_user_ids ?? m.meeting_attendees ?? []),
      notes: m.notes ?? m.meeting_detail ?? '',
    };
  });

  return {
    project: {
      id: project.project_id,
      name: project.project_name ?? '',
      deadline: project.final_due_date ?? '',
      detail: project.project_detail ?? '',
      deliverables: project.final_deliverable ?? '',
      members: memberList,
    },
    plan_version: {
      id: plan_version.plan_version_id,
      version: plan_version.version_number,
      ai_reasoning: snapshot.ai_reasoning ?? snapshot.plan_rationale ?? '',
      tasks,
      meetings,
    },
  };
}
