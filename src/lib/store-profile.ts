import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";

export type StoreCurrency = "TRY" | "USD";
export type StoreLanguage = "ar" | "tr" | "en";

export type StoreProfile = {
  schemaVersion: 1;
  workspaceId: string;
  name: string;
  phone: string;
  address: string;
  currency: StoreCurrency;
  language: StoreLanguage;
  updatedByUid: string;
};

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error("unauthenticated");
  return uid;
}

function profileRef(workspaceId: string) {
  return doc(firestoreDb, "workspaces", workspaceId, "storeProfile", "profile");
}

export async function getStoreProfile(workspaceId: string): Promise<StoreProfile | null> {
  requireUid();
  const snapshot = await getDoc(profileRef(workspaceId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as StoreProfile;
}

export async function saveStoreProfile(
  workspaceId: string,
  input: Pick<StoreProfile, "name" | "phone" | "address" | "currency" | "language">,
): Promise<StoreProfile> {
  const uid = requireUid();
  const name = input.name.trim();
  if (!name) throw new Error("store-name-required");

  const profile: StoreProfile = {
    schemaVersion: 1,
    workspaceId,
    name,
    phone: input.phone.trim(),
    address: input.address.trim(),
    currency: input.currency,
    language: input.language,
    updatedByUid: uid,
  };

  await setDoc(profileRef(workspaceId), {
    ...profile,
    updatedAt: serverTimestamp(),
  }, { merge: false });

  return profile;
}
