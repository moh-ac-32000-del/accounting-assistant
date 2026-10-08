import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import { requireActiveMember } from "./auth";

type Currency = "TRY" | "USD";
type Direction = "in" | "out";

function validKey(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(v);
}
function validAmount(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0;
}

export async function createCashMovementCommand(uid: string, data: unknown) {
  if (!data || typeof data !== "object") throw new HttpsError("invalid-argument", "invalid-command");
  const input = data as Record<string, unknown>;
  const workspaceId = typeof input.workspaceId === "string" ? input.workspaceId.trim() : "";
  const direction = input.direction;
  const currency = input.currency;
  const amountMinor = input.amountMinor;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const idempotencyKey = input.idempotencyKey;

  await requireActiveMember(uid, workspaceId);
  if (direction !== "in" && direction !== "out") throw new HttpsError("invalid-argument", "invalid-direction");
  if (currency !== "TRY" && currency !== "USD") throw new HttpsError("invalid-argument", "invalid-currency");
  if (!validAmount(amountMinor)) throw new HttpsError("invalid-argument", "invalid-amount-minor");
  if (!reason) throw new HttpsError("invalid-argument", "cash-reason-required");
  if (!validKey(idempotencyKey)) throw new HttpsError("invalid-argument", "invalid-idempotency-key");

  const movementRef = db.collection(`workspaces/${workspaceId}/cashMovements`).doc();
  const receiptRef = db.doc(`workspaces/${workspaceId}/operationReceipts/${idempotencyKey}`);

  return db.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      const r = receipt.data() ?? {};
      if (r.type !== "createCashMovement" || r.direction !== direction || r.currency !== currency || r.amountMinor !== amountMinor || r.reason !== reason || typeof r.movementId !== "string") {
        throw new HttpsError("already-exists", "idempotency-key-conflict");
      }
      const existing = await tx.get(db.doc(`workspaces/${workspaceId}/cashMovements/${r.movementId}`));
      if (!existing.exists) throw new HttpsError("internal", "operation-receipt-cash-movement-missing");
      return { ok: true as const, movement: existing.data(), replayed: true };
    }

    const balanceRef = db.doc(`workspaces/${workspaceId}/cashBalances/${currency}`);
    const balanceSnapshot = await tx.get(balanceRef);
    const currentBalance = balanceSnapshot.exists ? (balanceSnapshot.data()?.balanceMinor as number) : 0;
    if (!Number.isSafeInteger(currentBalance) || currentBalance < 0) {
      throw new HttpsError("failed-precondition", "invalid-cash-balance");
    }
    if (direction === "out" && amountMinor > currentBalance) {
      throw new HttpsError("failed-precondition", "insufficient-cash-balance");
    }

    const newBalance = direction === "in"
      ? currentBalance + amountMinor
      : currentBalance - amountMinor;
    if (!Number.isSafeInteger(newBalance) || newBalance < 0) {
      throw new HttpsError("failed-precondition", "invalid-cash-balance");
    }
      throw new HttpsError("failed-precondition", "invalid-cash-balance");
    }

    const now = Timestamp.now();
    const movement = {
      id: movementRef.id,
      schemaVersion: 1 as const,
      workspaceId,
      direction,
      currency,
      amountMinor,
      reason,
      createdByUid: uid,
      createdAt: now,
    };

    tx.create(movementRef, movement);
    tx.set(balanceRef, {
      schemaVersion: 1,
      workspaceId,
      currency,
      balanceMinor: newBalance,
      updatedAt: now,
    }, { merge: true });
    tx.create(db.doc(`workspaces/${workspaceId}/auditEvents/${movementRef.id}`), {
      schemaVersion: 1, type: "createCashMovement", uid, workspaceId, entityId: movementRef.id,
      direction, amountMinor, currency, reason, createdAt: now,
    });
    tx.create(receiptRef, {
      schemaVersion: 1,
      type: "createCashMovement",
      idempotencyKey,
      uid,
      movementId: movementRef.id,
      direction,
      currency,
      amountMinor,
      reason,
      createdAt: now,
    });

    return { ok: true as const, movement, replayed: false };
  });
}
