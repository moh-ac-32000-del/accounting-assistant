import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import { requireActiveMember } from "./auth";

type Currency = "TRY" | "USD";

function validAmount(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0;
}
function validKey(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(v);
}

export async function createJournalEntryCommand(uid: string, data: unknown) {
  if (!data || typeof data !== "object") throw new HttpsError("invalid-argument", "invalid-command");
  const input = data as Record<string, unknown>;
  const workspaceId = typeof input.workspaceId === "string" ? input.workspaceId.trim() : "";
  const currency = input.currency;
  const direction = input.direction;
  const amountMinor = input.amountMinor;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const idempotencyKey = input.idempotencyKey;

  await requireActiveMember(uid, workspaceId);
  if (currency !== "TRY" && currency !== "USD") throw new HttpsError("invalid-argument", "invalid-currency");
  if (direction !== "in" && direction !== "out") throw new HttpsError("invalid-argument", "invalid-direction");
  if (!validAmount(amountMinor)) throw new HttpsError("invalid-argument", "invalid-amount-minor");
  if (!reason) throw new HttpsError("invalid-argument", "journal-reason-required");
  if (!validKey(idempotencyKey)) throw new HttpsError("invalid-argument", "invalid-idempotency-key");

  const entryRef = db.collection(`workspaces/${workspaceId}/journalEntries`).doc();
  const receiptRef = db.doc(`workspaces/${workspaceId}/operationReceipts/${idempotencyKey}`);

  return db.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      const r = receipt.data() ?? {};
      if (r.type !== "createJournalEntry" || r.direction !== direction || r.currency !== currency || r.amountMinor !== amountMinor || r.reason !== reason || typeof r.entryId !== "string") {
        throw new HttpsError("already-exists", "idempotency-key-conflict");
      }
      const existing = await tx.get(db.doc(`workspaces/${workspaceId}/journalEntries/${r.entryId}`));
      if (!existing.exists) throw new HttpsError("internal", "operation-receipt-journal-entry-missing");
      return { ok: true as const, entry: existing.data(), replayed: true };
    }

    const now = Timestamp.now();
    const entry = {
      id: entryRef.id,
      schemaVersion: 1 as const,
      workspaceId,
      direction,
      currency: currency as Currency,
      amountMinor,
      reason,
      createdByUid: uid,
      createdAt: now,
    };

    tx.create(entryRef, entry);
    tx.create(db.doc(`workspaces/${workspaceId}/auditEvents/${entryRef.id}`), {
      schemaVersion: 1,
      type: "createJournalEntry",
      uid,
      workspaceId,
      entityId: entryRef.id,
      direction,
      currency,
      amountMinor,
      reason,
      createdAt: now,
    });
    tx.create(receiptRef, {
      schemaVersion: 1,
      type: "createJournalEntry",
      idempotencyKey,
      uid,
      entryId: entryRef.id,
      direction,
      currency,
      amountMinor,
      reason,
      createdAt: now,
    });

    return { ok: true as const, entry, replayed: false };
  });
}
