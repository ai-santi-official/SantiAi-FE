import { apiFetch } from './api';

export type ProjectDetail = {
  project_id: string;
  project_name: string;
  project_status: 'draft' | 'waiting_approval' | 'approved' | 'done';
  final_due_date: string | null;
  project_detail: string | null;
  final_deliverable: string | null;
};

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const res = await apiFetch(`/api/v1/projects/${projectId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch project: ${res.status}`);
  }
  const data = await res.json();
  return data.project as ProjectDetail;
}

export async function updateProject(
  projectId: string,
  data: {
    project_name?: string;
    final_due_date?: string;
    final_deliverable?: string;
    project_detail?: string;
  }
): Promise<ProjectDetail> {
  const res = await apiFetch(`/api/v1/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update project: ${res.status}`);
  }
  const result = await res.json();
  return result.project as ProjectDetail;
}
