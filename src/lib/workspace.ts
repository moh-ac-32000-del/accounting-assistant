import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase";

export type WorkspaceRole = "owner" | "admin" | "staff";

export type WorkspaceSummary = {
  id: string;
  name: string;
  ownerUid: string;
  status: "active" | "suspended";
  role: WorkspaceRole;
};

type WorkspaceDoc = {
  schemaVersion: 1;
  name: string;
  ownerUid: string;
  status: "active" | "suspended";
  createdAt: unknown;
  updatedAt: unknown;
};

type MembershipDoc = {
  schemaVersion: 1;
  uid: string;
  role: WorkspaceRole;
  status: "active" | "suspended";
  createdAt: unknown;
};

export async function createWorkspaceForCurrentUser(
  uid: string,
  name: string,
): Promise<WorkspaceSummary> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("workspace-name-required");
  }

  const workspaceRef = doc(collection(firestoreDb, "workspaces"));
  const memberRef = doc(workspaceRef, "members", uid);
  const userRef = doc(firestoreDb, "users", uid);

  const batch = writeBatch(firestoreDb);
  const now = serverTimestamp();

  const workspace: WorkspaceDoc = {
    schemaVersion: 1,
    name: trimmedName,
    ownerUid: uid,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const membership: MembershipDoc = {
    schemaVersion: 1,
    uid,
    role: "owner",
    status: "active",
    createdAt: now,
  };

  batch.set(workspaceRef, workspace);
  batch.set(memberRef, membership);
  batch.set(
    userRef,
    {
      schemaVersion: 1,
      uid,
      activeWorkspaceId: workspaceRef.id,
      updatedAt: now,
    },
    { merge: true },
  );

  await batch.commit();

  return {
    id: workspaceRef.id,
    name: trimmedName,
    ownerUid: uid,
    status: "active",
    role: "owner",
  };
}

export async function getActiveWorkspaceForCurrentUser(
  uid: string,
): Promise<WorkspaceSummary | null> {
  const userSnapshot = await getDoc(doc(firestoreDb, "users", uid));

  if (!userSnapshot.exists()) {
    return null;
  }

  const activeWorkspaceId = userSnapshot.data().activeWorkspaceId;

  if (typeof activeWorkspaceId !== "string" || !activeWorkspaceId) {
    return null;
  }

  const workspaceSnapshot = await getDoc(
    doc(firestoreDb, "workspaces", activeWorkspaceId),
  );

  if (!workspaceSnapshot.exists()) {
    return null;
  }

  const memberSnapshot = await getDoc(
    doc(firestoreDb, "workspaces", activeWorkspaceId, "members", uid),
  );

  if (!memberSnapshot.exists()) {
    return null;
  }

  const workspace = workspaceSnapshot.data() as WorkspaceDoc;
  const member = memberSnapshot.data() as MembershipDoc;

  return {
    id: workspaceSnapshot.id,
    name: workspace.name,
    ownerUid: workspace.ownerUid,
    status: workspace.status,
    role: member.role,
  };
}
