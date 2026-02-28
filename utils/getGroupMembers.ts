import mockData from "./mock/group-members.json";

/** Shape of each member as returned by GET /api/group-members */
export type GroupMember = {
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
};

/** Full API response envelope */
export type GroupMembersResponse = {
  line_group_id: string;
  members: GroupMember[];
};

/**
 * Fetches group members for the given LINE group.
 * TODO: replace mock with real API call:
 *   const res = await fetch(`/api/group-members?groupId=${groupId}`);
 *   return res.json() as Promise<GroupMembersResponse>;
 */
export async function getGroupMembers(): Promise<GroupMembersResponse> {
  return mockData as GroupMembersResponse;
}
