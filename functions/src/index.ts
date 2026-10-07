import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
const db = getFirestore();

setGlobalOptions({
  region: "europe-west1",
  maxInstances: 10,
});

type WorkspaceRole = "owner" | "admin" | "staff";

type WorkspaceMember = {
  uid: string;
  role: WorkspaceRole;
  status: "active" | "suspended";
};

async function requireActiveMember(
  uid: string,
  workspaceId: string,
): Promise<WorkspaceMember> {
  if (!workspaceId.trim()) {
    throw new HttpsError("invalid-argument", "workspace-id-required");
  }

  const memberSnapshot = await db.doc(
    `workspaces/${workspaceId}/members/${uid}`,
  ).get();

  if (!memberSnapshot.exists) {
    throw new HttpsError("permission-denied", "workspace-membership-required");
  }

  const member = memberSnapshot.data() as Partial<WorkspaceMember>;

  if (
    member.uid !== uid ||
    !["owner", "admin", "staff"].includes(member.role ?? "") ||
    member.status !== "active"
  ) {
    throw new HttpsError("permission-denied", "active-workspace-membership-required");
  }

  return member as WorkspaceMember;
}

export const backendHealth = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "authentication-required");
  }

  const workspaceId =
    typeof request.data?.workspaceId === "string"
      ? request.data.workspaceId
      : "";

  const member = await requireActiveMember(request.auth.uid, workspaceId);

  return {
    ok: true,
    uid: request.auth.uid,
    workspaceId,
    role: member.role,
  };
});
