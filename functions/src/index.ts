import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { requireActiveMember } from "./auth";
import { createDebtCommand } from "./debts";
import { createPaymentCommand } from "./payments";

setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

export const backendHealth = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "authentication-required");
  const workspaceId = typeof request.data?.workspaceId === "string" ? request.data.workspaceId : "";
  const member = await requireActiveMember(request.auth.uid, workspaceId);
  return { ok: true, uid: request.auth.uid, workspaceId, role: member.role };
});

export const createDebt = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "authentication-required");
  return createDebtCommand(request.auth.uid, request.data);
});

export const createPayment = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "authentication-required");
  return createPaymentCommand(request.auth.uid, request.data);
});
