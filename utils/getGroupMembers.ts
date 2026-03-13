/** Shape of each member as returned by GET /api/v1/line-groups/:id/members */
export type GroupMember = {
  user_id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
};

/** Full API response envelope */
export type GroupMembersResponse = {
  line_group_id: string;
  members: GroupMember[];
};

import { apiFetch } from './api';

export async function getGroupMembers(groupId?: string): Promise<GroupMembersResponse> {
  if (!groupId) {
    return { line_group_id: "", members: [] };
  }

  const res = await apiFetch(`/api/v1/line-groups/${groupId}/members`);

  if (!res.ok) {
    throw new Error(`Failed to fetch group members: ${res.status}`);
  }

  return res.json() as Promise<GroupMembersResponse>;
}
