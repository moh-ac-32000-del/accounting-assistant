import fs from "node:fs";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const projectId = "accounting-assistant-d291a";
const aliceUid = "rules-test-alice";
const bobUid = "rules-test-bob";
const firstWorkspaceId = "rules-test-workspace-a";
const secondWorkspaceId = "rules-test-workspace-b";

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: fs.readFileSync("firestore.rules", "utf8"),
  },
});

try {
  const unauthenticated = testEnv.unauthenticatedContext();
  await assertFails(
    getDoc(doc(unauthenticated.firestore(), "workspaces", firstWorkspaceId)),
  );

  const alice = testEnv.authenticatedContext(aliceUid);
  const bob = testEnv.authenticatedContext(bobUid);

  const aliceDb = alice.firestore();

  const bootstrapBatch = writeBatch(aliceDb);
  bootstrapBatch.set(doc(aliceDb, "workspaces", firstWorkspaceId), {
    schemaVersion: 1,
    name: "Test Store A",
    ownerUid: aliceUid,
    status: "active",
    createdAt: "test",
    updatedAt: "test",
  });
  bootstrapBatch.set(
    doc(aliceDb, "workspaces", firstWorkspaceId, "members", aliceUid),
    {
      schemaVersion: 1,
      uid: aliceUid,
      role: "owner",
      status: "active",
      createdAt: "test",
    },
  );
  bootstrapBatch.set(doc(aliceDb, "users", aliceUid), {
    schemaVersion: 1,
    uid: aliceUid,
    activeWorkspaceId: firstWorkspaceId,
    updatedAt: "test",
  });

  await assertSucceeds(bootstrapBatch.commit());

  await assertSucceeds(
    getDoc(doc(aliceDb, "workspaces", firstWorkspaceId)),
  );
  await assertSucceeds(
    getDoc(
      doc(
        aliceDb,
        "workspaces",
        firstWorkspaceId,
        "members",
        aliceUid,
      ),
    ),
  );
  await assertFails(
    getDoc(doc(bob.firestore(), "workspaces", firstWorkspaceId)),
  );
  await assertFails(
    getDoc(doc(bob.firestore(), "users", aliceUid)),
  );

  await assertSucceeds(
    updateDoc(doc(aliceDb, "workspaces", firstWorkspaceId), {
      name: "Test Store A Updated",
    }),
  );

  await assertFails(
    setDoc(doc(bob.firestore(), "workspaces", firstWorkspaceId, "members", bobUid), {
      schemaVersion: 1,
      uid: bobUid,
      role: "owner",
      status: "active",
      createdAt: "test",
    }),
  );

  await assertFails(
    updateDoc(doc(aliceDb, "users", aliceUid), {
      activeWorkspaceId: "not-a-member-workspace",
      updatedAt: "test-2",
    }),
  );

  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const adminDb = admin.firestore();

    await setDoc(doc(adminDb, "workspaces", secondWorkspaceId), {
      schemaVersion: 1,
      name: "Test Store B",
      ownerUid: "other-owner",
      status: "active",
      createdAt: "test",
      updatedAt: "test",
    });

    await setDoc(
      doc(adminDb, "workspaces", secondWorkspaceId, "members", aliceUid),
      {
        schemaVersion: 1,
        uid: aliceUid,
        role: "staff",
        status: "active",
        createdAt: "test",
      },
    );
  });

  await assertSucceeds(
    updateDoc(doc(aliceDb, "users", aliceUid), {
      activeWorkspaceId: secondWorkspaceId,
      updatedAt: "test-3",
    }),
  );

  await assertFails(
    updateDoc(doc(aliceDb, "users", aliceUid), {
      uid: "different-user",
    }),
  );

  await assertFails(
    updateDoc(doc(aliceDb, "users", aliceUid), {
      schemaVersion: 2,
    }),
  );

  console.log("Firestore Security Rules tests passed.");
} finally {
  await testEnv.cleanup();
}
