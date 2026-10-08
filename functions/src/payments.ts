import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firebase";
import { requireActiveMember } from "./auth";

type Currency = "TRY" | "USD";

function validKey(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(v);
}
function validAmount(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0;
}

export async function createPaymentCommand(uid: string, data: unknown) {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "invalid-command");
  }
  const input = data as Record<string, unknown>;
  const workspaceId = typeof input.workspaceId === "string" ? input.workspaceId.trim() : "";
  const debtId = typeof input.debtId === "string" ? input.debtId.trim() : "";
  const currency = input.currency;
  const amountMinor = input.amountMinor;
  const idempotencyKey = input.idempotencyKey;

  await requireActiveMember(uid, workspaceId);
  if (!debtId) throw new HttpsError("invalid-argument", "debt-id-required");
  if (currency !== "TRY" && currency !== "USD") {
    throw new HttpsError("invalid-argument", "invalid-currency");
  }
  if (!validAmount(amountMinor)) {
    throw new HttpsError("invalid-argument", "invalid-amount-minor");
  }
  if (!validKey(idempotencyKey)) {
    throw new HttpsError("invalid-argument", "invalid-idempotency-key");
  }

  const debtRef = db.doc(`workspaces/${workspaceId}/debts/${debtId}`);
  const paymentRef = db.collection(`workspaces/${workspaceId}/payments`).doc();
  const receiptRef = db.doc(`workspaces/${workspaceId}/operationReceipts/${idempotencyKey}`);

  return db.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      const receiptData = receipt.data() ?? {};
      const paymentId = receiptData.paymentId;
      if (receiptData.type !== "createPayment" || receiptData.debtId !== debtId || receiptData.currency !== currency || receiptData.amountMinor !== amountMinor || typeof paymentId !== "string") {
        throw new HttpsError("already-exists", "idempotency-key-conflict");
      }
      const existing = await tx.get(
        db.doc(`workspaces/${workspaceId}/payments/${paymentId}`),
      );
      if (!existing.exists) {
        throw new HttpsError("internal", "operation-receipt-payment-missing");
      }
      return { ok: true as const, payment: existing.data(), replayed: true };
    }

    const debtSnapshot = await tx.get(debtRef);
    if (!debtSnapshot.exists) {
      throw new HttpsError("not-found", "debt-not-found");
    }

    const debt = debtSnapshot.data() as {
      schemaVersion?: number;
      workspaceId?: string;
      customerId?: string;
      currency?: Currency;
      amountMinor?: number;
      paidMinor?: number;
      remainingMinor?: number;
      status?: string;
    };

    if (debt.workspaceId !== workspaceId || debt.schemaVersion !== 1) {
      throw new HttpsError("failed-precondition", "invalid-debt");
    }
    const paidMinor = debt.paidMinor;
    if (!validAmount(debt.amountMinor) || typeof paidMinor !== "number" || !Number.isSafeInteger(paidMinor) || paidMinor < 0 || !validAmount(debt.remainingMinor) || debt.amountMinor !== paidMinor + debt.remainingMinor) {
      throw new HttpsError("failed-precondition", "invalid-debt-balance");
    }
    if (debt.currency !== currency) {
      throw new HttpsError("failed-precondition", "currency-mismatch");
    }
    if (debt.status !== "open" || !validAmount(debt.remainingMinor)) {
      throw new HttpsError("failed-precondition", "debt-not-open");
    }
    if (amountMinor > debt.remainingMinor) {
      throw new HttpsError("failed-precondition", "payment-exceeds-remaining-debt");
    }

    const newPaid = paidMinor + amountMinor;
    const newRemaining = debt.remainingMinor - amountMinor;
    if (!Number.isSafeInteger(newPaid) || !Number.isSafeInteger(newRemaining) || newRemaining < 0 || newPaid + newRemaining !== debt.amountMinor) {
      throw new HttpsError("failed-precondition", "invalid-debt-balance");
    }
    const now = Timestamp.now();

    const payment = {
      id: paymentRef.id,
      schemaVersion: 1 as const,
      workspaceId,
      debtId,
      customerId: debt.customerId,
      currency,
      amountMinor,
      createdByUid: uid,
      createdAt: now,
    };

    const cashBalanceRef = db.doc(`workspaces/${workspaceId}/cashBalances/${currency}`);
    const cashBalanceSnapshot = await tx.get(cashBalanceRef);
    const currentCashBalance = cashBalanceSnapshot.exists ? (cashBalanceSnapshot.data()?.balanceMinor as number) : 0;
    if (!Number.isSafeInteger(currentCashBalance) || currentCashBalance < 0) throw new HttpsError("failed-precondition", "invalid-cash-balance");
    const newCashBalance = currentCashBalance + amountMinor;
    if (!Number.isSafeInteger(newCashBalance)) throw new HttpsError("failed-precondition", "invalid-cash-balance");

    const cashRef = db.doc(`workspaces/${workspaceId}/cashMovements/payment_${paymentRef.id}`);
    const cashMovement = {
      id: cashRef.id,
      schemaVersion: 1 as const,
      workspaceId,
      direction: "in" as const,
      currency,
      amountMinor,
      reason: "customer-payment",
      sourcePaymentId: paymentRef.id,
      createdByUid: uid,
      createdAt: now,
    };

    tx.create(paymentRef, payment);
    tx.create(cashRef, cashMovement);
    tx.set(cashBalanceRef, {
      schemaVersion: 1,
      workspaceId,
      currency,
      balanceMinor: newCashBalance,
      updatedAt: now,
    }, { merge: true });
    tx.create(db.doc(`workspaces/${workspaceId}/auditEvents/${paymentRef.id}`), {
      schemaVersion: 1, type: "createPayment", uid, workspaceId, entityId: paymentRef.id,
      debtId, amountMinor, currency, createdAt: now,
    });
    tx.update(debtRef, {
      paidMinor: newPaid,
      remainingMinor: newRemaining,
      status: newRemaining === 0 ? "settled" : "open",
      updatedAt: now,
    });
    tx.create(receiptRef, {
      schemaVersion: 1,
      type: "createPayment",
      idempotencyKey,
      uid,
      paymentId: paymentRef.id,
      debtId,
      currency,
      amountMinor,
      createdAt: now,
    });

    return { ok: true as const, payment, replayed: false };
  });
}
