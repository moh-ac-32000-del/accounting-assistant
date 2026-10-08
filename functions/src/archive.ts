import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import { requireActiveMember } from "./auth";

function validKey(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(v);
}

export async function archiveRecordCommand(uid: string, data: unknown) {
  if (!data || typeof data !== "object") throw new HttpsError("invalid-argument", "invalid-command");
  const input = data as Record<string, unknown>;
  const workspaceId = typeof input.workspaceId === "string" ? input.workspaceId.trim() : "";
  const sourceType = typeof input.sourceType === "string" ? input.sourceType.trim() : "";
  const sourceId = typeof input.sourceId === "string" ? input.sourceId.trim() : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const idempotencyKey = input.idempotencyKey;

  await requireActiveMember(uid, workspaceId);
  if (!sourceType || !sourceId || !reason) throw new HttpsError("invalid-argument", "archive-fields-required");
  if (!["debts", "payments", "cashMovements", "journalEntries", "dailyClosings"].includes(sourceType)) {
    throw new HttpsError("invalid-argument", "invalid-archive-source-type");
  }
  if (!["customers", "debts", "payments", "cashMovements", "journalEntries", "reminders"].includes(sourceType)) {
    throw new HttpsError("invalid-argument", "archive-source-type-not-allowed");
  }
  if (!validKey(idempotencyKey)) throw new HttpsError("invalid-argument", "invalid-idempotency-key");

  const sourceRef = db.doc(`workspaces/${workspaceId}/${sourceType}/${sourceId}`);
  const archiveRef = db.collection(`workspaces/${workspaceId}/archive`).doc();
  const receiptRef = db.doc(`workspaces/${workspaceId}/operationReceipts/${idempotencyKey}`);

  return db.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      const r = receipt.data() ?? {};
      if (r.type !== "archiveRecord" || r.sourceType !== sourceType || r.sourceId !== sourceId || r.reason !== reason || typeof r.archiveId !== "string") {
        throw new HttpsError("already-exists", "idempotency-key-conflict");
      }
      const existing = await tx.get(db.doc(`workspaces/${workspaceId}/archive/${r.archiveId}`));
      if (!existing.exists) throw new HttpsError("internal", "operation-receipt-archive-missing");
      return { ok: true as const, archive: existing.data(), replayed: true };
    }

    const source = await tx.get(sourceRef);
    if (!source.exists) throw new HttpsError("not-found", "archive-source-not-found");

    const now = Timestamp.now();
    const expireAt = Timestamp.fromMillis(now.toMillis() + 3 * 24 * 60 * 60 * 1000);
    const archive = {
      id: archiveRef.id,
      schemaVersion: 1 as const,
      workspaceId,
      sourceType,
      sourceId,
      reason,
      snapshot: source.data(),
      archivedByUid: uid,
      archivedAt: now,
      expireAt,
    };

    tx.create(archiveRef, archive);
    tx.create(db.doc(`workspaces/${workspaceId}/auditEvents/archive_${archiveRef.id}`), {
      schemaVersion: 1, type: "archiveRecord", uid, workspaceId,
      entityId: archiveRef.id, sourceType, sourceId, reason, expireAt, createdAt: now,
    });
    tx.create(receiptRef, {
      schemaVersion: 1, type: "archiveRecord", idempotencyKey, uid,
      archiveId: archiveRef.id, sourceType, sourceId, reason, createdAt: now,
    });

    return { ok: true as const, archive, replayed: false };
  });
}
