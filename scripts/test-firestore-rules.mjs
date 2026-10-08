import fs from "node:fs";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";

const projectId = "accounting-assistant-d291a";
const aliceUid = "rules-test-alice";
const bobUid = "rules-test-bob";
const firstWorkspaceId = "rules-test-workspace-a";
const secondWorkspaceId = "rules-test-workspace-b";
const thirdWorkspaceId = "rules-test-workspace-c";

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
});

try {
  const unauthenticated = testEnv.unauthenticatedContext();
  await assertFails(getDoc(doc(unauthenticated.firestore(), "workspaces", firstWorkspaceId)));

  const alice = testEnv.authenticatedContext(aliceUid);
  const bob = testEnv.authenticatedContext(bobUid);
  const aliceDb = alice.firestore();

  const bootstrap = writeBatch(aliceDb);
  bootstrap.set(doc(aliceDb, "workspaces", firstWorkspaceId), {
    schemaVersion: 1, name: "Test Store A", ownerUid: aliceUid, status: "active",
    createdAt: "test", updatedAt: "test",
  });
  bootstrap.set(doc(aliceDb, "workspaces", firstWorkspaceId, "members", aliceUid), {
    schemaVersion: 1, uid: aliceUid, role: "owner", status: "active", createdAt: "test",
  });
  bootstrap.set(doc(aliceDb, "users", aliceUid), {
    schemaVersion: 1, uid: aliceUid, activeWorkspaceId: firstWorkspaceId, updatedAt: "test",
  });
  await assertSucceeds(bootstrap.commit());

  await assertSucceeds(getDoc(doc(aliceDb, "workspaces", firstWorkspaceId)));
  await assertSucceeds(getDoc(doc(aliceDb, "workspaces", firstWorkspaceId, "members", aliceUid)));
  await assertFails(getDoc(doc(bob.firestore(), "workspaces", firstWorkspaceId)));
  await assertFails(getDoc(doc(bob.firestore(), "users", aliceUid)));

  await assertSucceeds(updateDoc(doc(aliceDb, "workspaces", firstWorkspaceId), { name: "Test Store A Updated" }));
  await assertFails(updateDoc(doc(aliceDb, "workspaces", firstWorkspaceId), { status: "suspended" }));
  await assertFails(updateDoc(doc(aliceDb, "workspaces", firstWorkspaceId, "members", aliceUid), { role: "staff" }));

  await assertFails(
    setDoc(doc(bob.firestore(), "workspaces", firstWorkspaceId, "members", bobUid), {
      schemaVersion: 1, uid: bobUid, role: "owner", status: "active", createdAt: "test",
    }),
  );

  await assertFails(
    updateDoc(doc(aliceDb, "users", aliceUid), {
      activeWorkspaceId: "not-a-member-workspace", updatedAt: "test-2",
    }),
  );

  const secondWorkspace = writeBatch(aliceDb);
  secondWorkspace.set(doc(aliceDb, "workspaces", secondWorkspaceId), {
    schemaVersion: 1, name: "Test Store B", ownerUid: aliceUid, status: "active",
    createdAt: "test", updatedAt: "test",
  });
  secondWorkspace.set(doc(aliceDb, "workspaces", secondWorkspaceId, "members", aliceUid), {
    schemaVersion: 1, uid: aliceUid, role: "owner", status: "active", createdAt: "test",
  });
  secondWorkspace.update(doc(aliceDb, "users", aliceUid), {
    activeWorkspaceId: secondWorkspaceId, updatedAt: "test-3",
  });
  await assertSucceeds(secondWorkspace.commit());

  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const adminDb = admin.firestore();
    await setDoc(doc(adminDb, "workspaces", thirdWorkspaceId), {
      schemaVersion: 1, name: "Test Store C", ownerUid: "other-owner", status: "active",
      createdAt: "test", updatedAt: "test",
    });
    await setDoc(doc(adminDb, "workspaces", thirdWorkspaceId, "members", aliceUid), {
      schemaVersion: 1, uid: aliceUid, role: "staff", status: "active", createdAt: "test",
    });
  });

  await assertSucceeds(
    updateDoc(doc(aliceDb, "users", aliceUid), {
      activeWorkspaceId: thirdWorkspaceId, updatedAt: "test-4",
    }),
  );

  await assertFails(updateDoc(doc(aliceDb, "users", aliceUid), { uid: "different-user" }));
  await assertFails(updateDoc(doc(aliceDb, "users", aliceUid), { schemaVersion: 2 }));

  const customerRef = doc(aliceDb, "workspaces", thirdWorkspaceId, "customers", "customer-a");
  await assertSucceeds(
    setDoc(customerRef, {
      schemaVersion: 1,
      workspaceId: thirdWorkspaceId,
      name: "Test Customer",
      phone: "5550000000",
      address: "Test Address",
      notes: "Test Notes",
      status: "active",
      createdByUid: aliceUid,
      createdAt: "test",
      updatedAt: "test",
    }),
  );

  await assertSucceeds(getDoc(customerRef));

  await assertFails(
    setDoc(doc(bob.firestore(), "workspaces", thirdWorkspaceId, "customers", "customer-b"), {
      schemaVersion: 1,
      workspaceId: thirdWorkspaceId,
      name: "Unauthorized Customer",
      phone: "",
      address: "",
      notes: "",
      status: "active",
      createdByUid: bobUid,
      createdAt: "test",
      updatedAt: "test",
    }),
  );

  await assertFails(
    updateDoc(customerRef, { workspaceId: "another-workspace" }),
  );
  await assertFails(
    updateDoc(customerRef, { createdByUid: bobUid }),
  );
  await assertSucceeds(
    updateDoc(customerRef, { name: "Updated Customer", status: "archived", updatedByUid: aliceUid, updatedAt: "test-5" }),
  );
  await assertFails(
    updateDoc(customerRef, { status: "invalid" }),
  );
  await assertFails(
    updateDoc(customerRef, { createdAt: "changed" }),
  );
  await assertFails(
    updateDoc(customerRef, { schemaVersion: 2 }),
  );
  await assertFails(
    updateDoc(customerRef, { unexpectedField: true }),
  );

  await assertFails(getDoc(doc(aliceDb, "customers", "future-customer")));
  await assertFails(getDoc(doc(aliceDb, "debts", "future-debt")));
  await assertFails(getDoc(doc(aliceDb, "payments", "future-payment")));

  const debtRef = doc(aliceDb, "workspaces", thirdWorkspaceId, "debts", "debt-a");
  await assertFails(setDoc(debtRef, {
    schemaVersion: 1,
    workspaceId: thirdWorkspaceId,
    customerId: "customer-a",
    currency: "TRY",
    amountMinor: 10000,
    paidMinor: 0,
    remainingMinor: 10000,
    status: "open",
    createdByUid: aliceUid,
    createdAt: "test",
    updatedAt: "test",
  }));

  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "workspaces", thirdWorkspaceId, "debts", "debt-a"), {
      schemaVersion: 1,
      workspaceId: thirdWorkspaceId,
      customerId: "customer-a",
      currency: "TRY",
      amountMinor: 10000,
      paidMinor: 0,
      remainingMinor: 10000,
      status: "open",
      createdByUid: aliceUid,
      createdAt: "test",
      updatedAt: "test",
    });
  });

  await assertSucceeds(getDoc(debtRef));

  const paymentRef = doc(aliceDb, "workspaces", thirdWorkspaceId, "payments", "payment-a");
  await assertFails(setDoc(paymentRef, {
    schemaVersion: 1,
    workspaceId: thirdWorkspaceId,
    debtId: "debt-a",
    customerId: "customer-a",
    currency: "TRY",
    amountMinor: 5000,
    createdByUid: aliceUid,
    createdAt: "test",
  }));

  await assertFails(updateDoc(debtRef, { remainingMinor: 5000 }));
  await assertFails(setDoc(
    doc(aliceDb, "workspaces", thirdWorkspaceId, "operationReceipts", "receipt-a"),
    { type: "createDebt" },
  ));

  console.log("Firestore Security Rules tests passed.");
} finally {
  await testEnv.cleanup();
}
