import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { requireActiveMember } from "./auth";
import { createDebtCommand } from "./debts";
import { createPaymentCommand } from "./payments";
import { createCashMovementCommand } from "./cash";
import { createJournalEntryCommand } from "./journal";
import { closeDayCommand } from "./closing";
import { archiveRecordCommand } from "./archive";

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

export const archiveRecord = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "authentication-required");
  return archiveRecordCommand(request.auth.uid, request.data);
});

export const closeDay = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "authentication-required");
  return closeDayCommand(request.auth.uid, request.data);
});

export const createJournalEntry = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "authentication-required");
  return createJournalEntryCommand(request.auth.uid, request.data);
});

export const createCashMovement = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "authentication-required");
  return createCashMovementCommand(request.auth.uid, request.data);
});
