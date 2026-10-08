import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";

export type WorkspaceRole = "owner" | "admin" | "staff";
export type WorkspaceMember = {
  uid: string;
  role: WorkspaceRole;
  status: "active" | "suspended";
};

export async function requireActiveMember(uid: string, workspaceId: string): Promise<WorkspaceMember> {
  if (!workspaceId.trim()) throw new HttpsError("invalid-argument", "workspace-id-required");
  const snapshot = await db.doc(`workspaces/${workspaceId}/members/${uid}`).get();
  if (!snapshot.exists) throw new HttpsError("permission-denied", "workspace-membership-required");
  const member = snapshot.data() as Partial<WorkspaceMember>;
  if (member.uid !== uid || !["owner","admin","staff"].includes(member.role ?? "") || member.status !== "active") {
    throw new HttpsError("permission-denied", "active-workspace-membership-required");
  }
  return member as WorkspaceMember;
}
