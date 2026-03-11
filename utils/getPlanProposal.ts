import mockData from "./mock/plan-proposal.json";

export type PlanMember = {
  line_user_id: string;
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
  line_group_id: string;
  project: Project;
  plan_version: PlanVersion;
};

/**
 * Fetches the AI-generated plan proposal for the current project.
 * TODO: replace mock with real API call:
 *   const res = await fetch(`/api/plan-proposal?projectId=${projectId}`);
 *   return res.json() as Promise<PlanProposalResponse>;
 */
export async function getPlanProposal(): Promise<PlanProposalResponse> {
  return mockData as PlanProposalResponse;
}
