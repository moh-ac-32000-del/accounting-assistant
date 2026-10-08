import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import { requireActiveMember } from "./auth";

type Currency = "TRY" | "USD";

function validKey(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(v);
}
function validAmount(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

export async function closeDayCommand(uid: string, data: unknown) {
  if (!data || typeof data !== "object") throw new HttpsError("invalid-argument", "invalid-command");
  const input = data as Record<string, unknown>;
  const workspaceId = typeof input.workspaceId === "string" ? input.workspaceId.trim() : "";
  const closingDate = typeof input.closingDate === "string" ? input.closingDate.trim() : "";
  const idempotencyKey = input.idempotencyKey;
  const countedBalances = input.balances;

  const member = await requireActiveMember(uid, workspaceId);
  if (member.role !== "owner" && member.role !== "admin") {
    throw new HttpsError("permission-denied", "daily-closing-role-required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) {
    throw new HttpsError("invalid-argument", "invalid-closing-date");
  }
  if (!validKey(idempotencyKey)) throw new HttpsError("invalid-argument", "invalid-idempotency-key");
  if (!countedBalances || typeof countedBalances !== "object") throw new HttpsError("invalid-argument", "balances-required");

  const raw = countedBalances as Record<string, unknown>;
  const normalized: Partial<Record<Currency, number>> = {};
  for (const currency of ["TRY", "USD"] as const) {
    if (raw[currency] !== undefined) {
      if (!validAmount(raw[currency])) throw new HttpsError("invalid-argument", "invalid-closing-balance");
      normalized[currency] = raw[currency] as number;
    }
  }
  if (Object.keys(normalized).length === 0) throw new HttpsError("invalid-argument", "closing-balance-required");

  const closingRef = db.doc(`workspaces/${workspaceId}/dailyClosings/${closingDate}`);
  const cashBalanceRefs = (["TRY", "USD"] as const).map((currency) => db.doc(`workspaces/${workspaceId}/cashBalances/${currency}`));
  const receiptRef = db.doc(`workspaces/${workspaceId}/operationReceipts/${idempotencyKey}`);

  return db.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      const r = receipt.data() ?? {};
      if (r.type !== "closeDay" || r.closingDate !== closingDate || r.balancesHash !== JSON.stringify(normalized)) {
        throw new HttpsError("already-exists", "idempotency-key-conflict");
      }
      const existing = await tx.get(closingRef);
      if (!existing.exists) throw new HttpsError("internal", "operation-receipt-closing-missing");
      return { ok: true as const, closing: existing.data(), replayed: true };
    }

    const existing = await tx.get(closingRef);
    if (existing.exists) throw new HttpsError("already-exists", "day-already-closed");

    const balanceSnapshots = await Promise.all(cashBalanceRefs.map((ref) => tx.get(ref)));
    const expectedBalances: Partial<Record<Currency, number>> = {};
    for (let i = 0; i < cashBalanceRefs.length; i++) {
      const currency = ["TRY", "USD"][i] as Currency;
      const snapshot = balanceSnapshots[i];
      const value = snapshot.exists ? snapshot.data()?.balanceMinor : 0;
      if (!Number.isSafeInteger(value) || (value as number) < 0) {
        throw new HttpsError("failed-precondition", "invalid-cash-balance");
      }
      if (normalized[currency] !== undefined || snapshot.exists) expectedBalances[currency] = value as number;
    }

    const now = Timestamp.now();
    const closing = {
      id: closingDate,
      schemaVersion: 1 as const,
      workspaceId,
      closingDate,
      countedBalances: normalized,
      expectedBalances,
      closedByUid: uid,
      closedAt: now,
    };

    tx.create(closingRef, closing);
    tx.create(db.doc(`workspaces/${workspaceId}/auditEvents/closing_${closingDate}`), {
      schemaVersion: 1,
      type: "closeDay",
      uid,
      workspaceId,
      entityId: closingDate,
      closingDate,
      countedBalances: normalized,
      expectedBalances,
      createdAt: now,
    });
    tx.create(receiptRef, {
      schemaVersion: 1,
      type: "closeDay",
      idempotencyKey,
      uid,
      closingDate,
      balancesHash: JSON.stringify({ countedBalances: normalized, expectedBalances }),
      createdAt: now,
    });

    return { ok: true as const, closing, replayed: false };
  });
}
