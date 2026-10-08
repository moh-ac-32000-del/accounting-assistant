import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase";

export type CustomerStatus = "active" | "archived";

export type Customer = {
  id: string;
  schemaVersion: 1;
  workspaceId: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  status: CustomerStatus;
  createdByUid: string;
  createdAt: unknown;
  updatedAt: unknown;
};

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error("unauthenticated");
  return uid;
}

function customersRef(workspaceId: string) {
  return collection(firestoreDb, "workspaces", workspaceId, "customers");
}

function customerRef(workspaceId: string, customerId: string) {
  return doc(firestoreDb, "workspaces", workspaceId, "customers", customerId);
}

function toCustomer(id: string, data: DocumentData): Customer {
  return {
    id,
    schemaVersion: data.schemaVersion,
    workspaceId: data.workspaceId,
    name: data.name,
    phone: data.phone,
    address: data.address,
    notes: data.notes,
    status: data.status,
    createdByUid: data.createdByUid,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listCustomers(workspaceId: string): Promise<Customer[]> {
  requireUid();
  const snapshot = await getDocs(customersRef(workspaceId));
  return snapshot.docs
    .map((item) => toCustomer(item.id, item.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCustomer(
  workspaceId: string,
  input: Pick<Customer, "name" | "phone" | "address" | "notes">,
): Promise<Customer> {
  const uid = requireUid();
  const name = input.name.trim();
  if (!name) throw new Error("customer-name-required");

  const ref = await addDoc(customersRef(workspaceId), {
    schemaVersion: 1,
    workspaceId,
    name,
    phone: input.phone.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    status: "active",
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error("customer-create-readback-failed");
  return toCustomer(snapshot.id, snapshot.data());
}

export async function getCustomer(
  workspaceId: string,
  customerId: string,
): Promise<Customer | null> {
  requireUid();
  const snapshot = await getDoc(customerRef(workspaceId, customerId));
  if (!snapshot.exists()) return null;
  return toCustomer(snapshot.id, snapshot.data());
}

export async function updateCustomer(
  workspaceId: string,
  customerId: string,
  input: Pick<Customer, "name" | "phone" | "address" | "notes" | "status">,
): Promise<Customer> {
  const uid = requireUid();
  const name = input.name.trim();
  if (!name) throw new Error("customer-name-required");

  await setDoc(
    customerRef(workspaceId, customerId),
    {
      name,
      phone: input.phone.trim(),
      address: input.address.trim(),
      notes: input.notes.trim(),
      status: input.status,
      updatedByUid: uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const snapshot = await getDoc(customerRef(workspaceId, customerId));
  if (!snapshot.exists()) throw new Error("customer-update-readback-failed");
  return toCustomer(snapshot.id, snapshot.data());
}
