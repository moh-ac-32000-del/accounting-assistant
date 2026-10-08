import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import { requireActiveMember } from "./auth";

function validKey(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(v);
}

export async function createReminderCommand(uid: string, data: unknown) {
  if (!data || typeof data !== "object") throw new HttpsError("invalid-argument", "invalid-command");
  const input = data as Record<string, unknown>;
  const workspaceId = typeof input.workspaceId === "string" ? input.workspaceId.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const dueAtMs = input.dueAtMs;
  const idempotencyKey = input.idempotencyKey;

  await requireActiveMember(uid, workspaceId);
  if (!title) throw new HttpsError("invalid-argument", "reminder-title-required");
  if (typeof dueAtMs !== "number" || !Number.isSafeInteger(dueAtMs) || dueAtMs <= Date.now()) {
    throw new HttpsError("invalid-argument", "invalid-reminder-time");
  }
  if (!validKey(idempotencyKey)) throw new HttpsError("invalid-argument", "invalid-idempotency-key");

  const reminderRef = db.collection(`workspaces/${workspaceId}/reminders`).doc();
  const receiptRef = db.doc(`workspaces/${workspaceId}/operationReceipts/${idempotencyKey}`);

  return db.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      const r = receipt.data() ?? {};
      if (r.type !== "createReminder" || r.title !== title || r.note !== note || r.dueAtMs !== dueAtMs || typeof r.reminderId !== "string") {
        throw new HttpsError("already-exists", "idempotency-key-conflict");
      }
      const existing = await tx.get(db.doc(`workspaces/${workspaceId}/reminders/${r.reminderId}`));
      if (!existing.exists) throw new HttpsError("internal", "operation-receipt-reminder-missing");
      return { ok: true as const, reminder: existing.data(), replayed: true };
    }

    const now = Timestamp.now();
    const reminder = {
      id: reminderRef.id,
      schemaVersion: 1 as const,
      workspaceId,
      title,
      note,
      dueAt: Timestamp.fromMillis(dueAtMs),
      status: "pending" as const,
      createdByUid: uid,
      createdAt: now,
      updatedAt: now,
    };

    tx.create(reminderRef, reminder);
    tx.create(db.doc(`workspaces/${workspaceId}/auditEvents/reminder_${reminderRef.id}`), {
      schemaVersion: 1,
      type: "createReminder",
      uid,
      workspaceId,
      entityId: reminderRef.id,
      dueAt: reminder.dueAt,
      createdAt: now,
    });
    tx.create(receiptRef, {
      schemaVersion: 1,
      type: "createReminder",
      idempotencyKey,
      uid,
      reminderId: reminderRef.id,
      title,
      note,
      dueAtMs,
      createdAt: now,
    });

    return { ok: true as const, reminder, replayed: false };
  });
}
