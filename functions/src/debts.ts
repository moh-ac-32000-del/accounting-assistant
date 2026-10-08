import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import { requireActiveMember } from "./auth";

type Currency = "TRY" | "USD";
type DebtStatus = "open" | "settled";
type Debt = {
  id: string; schemaVersion: 1; workspaceId: string; customerId: string;
  currency: Currency; amountMinor: number; paidMinor: number; remainingMinor: number;
  status: DebtStatus; createdByUid: string; createdAt: Timestamp; updatedAt: Timestamp;
};

function isCurrency(v: unknown): v is Currency { return v === "TRY" || v === "USD"; }
function validKey(v: unknown): v is string { return typeof v === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(v); }
function validAmount(v: unknown): v is number { return typeof v === "number" && Number.isSafeInteger(v) && v > 0; }

export async function createDebtCommand(uid: string, data: unknown) {
  if (!data || typeof data !== "object") throw new HttpsError("invalid-argument", "invalid-command");
  const input = data as Record<string, unknown>;
  const workspaceId = typeof input.workspaceId === "string" ? input.workspaceId.trim() : "";
  const customerId = typeof input.customerId === "string" ? input.customerId.trim() : "";
  const currency = input.currency;
  const amountMinor = input.amountMinor;
  const idempotencyKey = input.idempotencyKey;
  await requireActiveMember(uid, workspaceId);
  if (!customerId) throw new HttpsError("invalid-argument", "customer-id-required");
  if (!isCurrency(currency)) throw new HttpsError("invalid-argument", "invalid-currency");
  if (!validAmount(amountMinor)) throw new HttpsError("invalid-argument", "invalid-amount-minor");
  if (!validKey(idempotencyKey)) throw new HttpsError("invalid-argument", "invalid-idempotency-key");

  const customerRef = db.doc(`workspaces/${workspaceId}/customers/${customerId}`);
  const receiptRef = db.doc(`workspaces/${workspaceId}/operationReceipts/${idempotencyKey}`);
  const debtRef = db.collection(`workspaces/${workspaceId}/debts`).doc();

  return db.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      const receiptData = receipt.data() ?? {};
      const debtId = receiptData.debtId;
      if (receiptData.type !== "createDebt" || receiptData.customerId !== customerId || receiptData.currency !== currency || receiptData.amountMinor !== amountMinor || typeof debtId !== "string") {
        throw new HttpsError("already-exists", "idempotency-key-conflict");
      }
      const existing = await tx.get(db.doc(`workspaces/${workspaceId}/debts/${debtId}`));
      if (!existing.exists) throw new HttpsError("internal", "operation-receipt-debt-missing");
      return { ok: true as const, debt: existing.data() as Debt, replayed: true };
    }

    const customer = await tx.get(customerRef);
    if (!customer.exists) throw new HttpsError("not-found", "customer-not-found");
    const customerData = customer.data() as { workspaceId?: string; status?: string };
    if (customerData.workspaceId !== workspaceId || customerData.status !== "active") {
      throw new HttpsError("failed-precondition", "customer-not-active");
    }

    const now = Timestamp.now();
    const debt: Debt = {
      id: debtRef.id, schemaVersion: 1, workspaceId, customerId, currency,
      amountMinor, paidMinor: 0, remainingMinor: amountMinor, status: "open",
      createdByUid: uid, createdAt: now, updatedAt: now,
    };
    tx.create(debtRef, debt);
    tx.create(db.doc(`workspaces/${workspaceId}/auditEvents/${debtRef.id}`), {
      schemaVersion: 1, type: "createDebt", uid, workspaceId, entityId: debtRef.id,
      amountMinor, currency, customerId, createdAt: now,
    });
    tx.create(receiptRef, { schemaVersion: 1, type: "createDebt", idempotencyKey, uid, debtId: debtRef.id, customerId, currency, amountMinor, createdAt: now });
    return { ok: true as const, debt, replayed: false };
  });
}
