import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../firebase";
import { createDebtCommand } from "../debts";
import { createPaymentCommand } from "../payments";
import { createCashMovementCommand } from "../cash";
import { closeDayCommand } from "../closing";

const workspaceId = "command-test-workspace";
const ownerUid = "command-test-owner";
const staffUid = "command-test-staff";
const customerId = "command-test-customer";

async function seed() {
  const batch = db.batch();
  batch.set(db.doc(`workspaces/${workspaceId}`), {
    schemaVersion: 1, name: "Command Test", ownerUid, status: "active",
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
  batch.set(db.doc(`workspaces/${workspaceId}/members/${ownerUid}`), {
    schemaVersion: 1, uid: ownerUid, role: "owner", status: "active", createdAt: Timestamp.now(),
  });
  batch.set(db.doc(`workspaces/${workspaceId}/members/${staffUid}`), {
    schemaVersion: 1, uid: staffUid, role: "staff", status: "active", createdAt: Timestamp.now(),
  });
  batch.set(db.doc(`workspaces/${workspaceId}/customers/${customerId}`), {
    schemaVersion: 1, workspaceId, name: "Test Customer", status: "active",
    createdByUid: ownerUid, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
  await batch.commit();
}

async function expectReject(fn: () => Promise<unknown>, code: string) {
  await assert.rejects(fn, (error: unknown) => {
    assert.equal((error as { code?: string }).code, code);
    return true;
  });
}

async function main() {
  await db.recursiveDelete(db.doc(`workspaces/${workspaceId}`)).catch(() => {});
  await seed();

  const debtInput = {
    workspaceId, customerId, currency: "TRY" as const, amountMinor: 10000,
    idempotencyKey: "debt-test-1",
  };
  const firstDebt = await createDebtCommand(ownerUid, debtInput);
  assert.equal(firstDebt.replayed, false);
  const replayDebt = await createDebtCommand(ownerUid, debtInput);
  assert.equal(replayDebt.replayed, true);
  assert.equal(replayDebt.debt.id, firstDebt.debt.id);

  await expectReject(
    () => createDebtCommand(ownerUid, { ...debtInput, amountMinor: 11000 }),
    "already-exists",
  );

  await expectReject(
    () => createPaymentCommand(ownerUid, {
      workspaceId, debtId: firstDebt.debt.id, currency: "TRY", amountMinor: 10001,
      idempotencyKey: "payment-too-much",
    }),
    "failed-precondition",
  );

  const payment = await createPaymentCommand(ownerUid, {
    workspaceId, debtId: firstDebt.debt.id, currency: "TRY", amountMinor: 4000,
    idempotencyKey: "payment-test-1",
  });
  assert.equal(payment.replayed, false);
  const paymentReplay = await createPaymentCommand(ownerUid, {
    workspaceId, debtId: firstDebt.debt.id, currency: "TRY", amountMinor: 4000,
    idempotencyKey: "payment-test-1",
  });
  assert.equal(paymentReplay.replayed, true);

  const debtAfterPayment = (await db.doc(`workspaces/${workspaceId}/debts/${firstDebt.debt.id}`).get()).data()!;
  assert.equal(debtAfterPayment.paidMinor, 4000);
  assert.equal(debtAfterPayment.remainingMinor, 6000);

  const cashAfterPayment = (await db.doc(`workspaces/${workspaceId}/cashBalances/TRY`).get()).data()!;
  assert.equal(cashAfterPayment.balanceMinor, 4000);

  const cashOut = await createCashMovementCommand(ownerUid, {
    workspaceId, direction: "out", currency: "TRY", amountMinor: 1500,
    reason: "test expense", idempotencyKey: "cash-out-1",
  });
  assert.equal(cashOut.replayed, false);
  const cashAfterOut = (await db.doc(`workspaces/${workspaceId}/cashBalances/TRY`).get()).data()!;
  assert.equal(cashAfterOut.balanceMinor, 2500);

  await expectReject(
    () => createCashMovementCommand(ownerUid, {
      workspaceId, direction: "out", currency: "TRY", amountMinor: 2501,
      reason: "too large", idempotencyKey: "cash-out-too-much",
    }),
    "failed-precondition",
  );

  await expectReject(
    () => createPaymentCommand(staffUid, {
      workspaceId, debtId: firstDebt.debt.id, currency: "TRY", amountMinor: 1000,
      idempotencyKey: "payment-staff",
    }),
    "permission-denied",
  );

  const closing = await closeDayCommand(ownerUid, {
    workspaceId, closingDate: "2099-01-01", balances: { TRY: 2500 },
    idempotencyKey: "closing-test-1",
  });
  assert.equal(closing.replayed, false);
  assert.equal((closing.closing as { expectedBalances: { TRY: number } }).expectedBalances.TRY, 2500);

  const closingReplay = await closeDayCommand(ownerUid, {
    workspaceId, closingDate: "2099-01-01", balances: { TRY: 2500 },
    idempotencyKey: "closing-test-1",
  });
  assert.equal(closingReplay.replayed, true);

  await expectReject(
    () => closeDayCommand(ownerUid, {
      workspaceId, closingDate: "2099-01-01", balances: { TRY: 2500 },
      idempotencyKey: "closing-test-2",
    }),
    "already-exists",
  );

  console.log("Trusted financial command tests passed.");
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
