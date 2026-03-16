export type GroupProject = {
  project_id: string;
  project_name: string;
  project_status: string;
  final_due_date: string | null;
};

export type GroupProjectsResponse = {
  line_group_id: string;
  projects: GroupProject[];
};

import { apiFetch } from './api';

export async function getGroupProjects(groupId?: string): Promise<GroupProjectsResponse> {
  if (!groupId) {
    return { line_group_id: "", projects: [] };
  }

  const res = await apiFetch(`/api/v1/line-groups/${groupId}/projects`);

  if (!res.ok) {
    throw new Error(`Failed to fetch group projects: ${res.status}`);
  }

  return res.json() as Promise<GroupProjectsResponse>;
}
