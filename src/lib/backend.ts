import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/lib/firebase";

const functions = getFunctions(firebaseApp, "europe-west1");

type BackendHealthResponse = {
  ok: boolean;
  uid: string;
  workspaceId: string;
  role: "owner" | "admin" | "staff";
};

export async function checkBackendHealth(
  workspaceId: string,
): Promise<BackendHealthResponse> {
  const command = httpsCallable<
    { workspaceId: string },
    BackendHealthResponse
  >(functions, "backendHealth");

  const result = await command({ workspaceId });
  return result.data;
}
