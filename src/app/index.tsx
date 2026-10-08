import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { firebaseAuth } from "@/lib/firebase";
import { isRTL, t, type AppLanguage } from "@/lib/i18n";
import { createCustomer, listCustomers, type Customer } from "@/lib/customers";
import { listDebts, type Debt } from "@/lib/debts";
import { archiveRecord, closeDay, createCashMovement, createDebt, createJournalEntry, createPayment, createReminder } from "@/lib/backend";
import { listCashMovements, type CashMovement } from "@/lib/cash";
import { listJournalEntries, type JournalEntry } from "@/lib/journal";
import { listDailyClosings, type DailyClosing } from "@/lib/closing";
import { listReminders, type Reminder } from "@/lib/reminders";
import { listArchive, type ArchiveRecord } from "@/lib/archive";
import {
  getStoreProfile,
  saveStoreProfile,
  type StoreCurrency,
} from "@/lib/store-profile";
import {
  createWorkspaceForCurrentUser,
  getActiveWorkspaceForCurrentUser,
  type WorkspaceSummary,
} from "@/lib/workspace";

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState(t(storeLanguage, "storeDefault"));
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(
    firebaseAuth.currentUser,
  );
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeCurrency, setStoreCurrency] = useState<StoreCurrency>("TRY");
  const [storeLanguage, setStoreLanguage] = useState<AppLanguage>("ar");
  const [profileSaved, setProfileSaved] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtCustomerId, setDebtCustomerId] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtCurrency, setDebtCurrency] = useState<"TRY" | "USD">("TRY");
  const [paymentDebtId, setPaymentDebtId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashDirection, setCashDirection] = useState<"in" | "out">("in");
  const [cashCurrency, setCashCurrency] = useState<"TRY" | "USD">("TRY");
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalDirection, setJournalDirection] = useState<"in" | "out">("in");
  const [journalCurrency, setJournalCurrency] = useState<"TRY" | "USD">("TRY");
  const [journalAmount, setJournalAmount] = useState("");
  const [journalReason, setJournalReason] = useState("");
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [closingTry, setClosingTry] = useState("");
  const [closingUsd, setClosingUsd] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminderDueAt, setReminderDueAt] = useState("");
  const [archiveRecords, setArchiveRecords] = useState<ArchiveRecord[]>([]);

  const rtl = isRTL(storeLanguage);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      setCurrentUser(user);
      setWorkspace(null);

      if (!user) return;

      try {
        const activeWorkspace = await getActiveWorkspaceForCurrentUser();
        setWorkspace(activeWorkspace);
        if (activeWorkspace) {
          try { setCustomers(await listCustomers(activeWorkspace.id));
            setDebts(await listDebts(activeWorkspace.id));
            setCashMovements(await listCashMovements(activeWorkspace.id));
            setJournalEntries(await listJournalEntries(activeWorkspace.id));
            setDailyClosings(await listDailyClosings(activeWorkspace.id));
            setReminders(await listReminders(activeWorkspace.id));
            setArchiveRecords(await listArchive(activeWorkspace.id)); }
          catch (error) { setMessage(t(storeLanguage, "customersReadFailed") + ": " + (error instanceof Error ? error.message : "unknown-error")); }
        }

        if (activeWorkspace) {
          try {
            const profile = await getStoreProfile(activeWorkspace.id);

            if (profile) {
              setStoreName(profile.name);
              setStorePhone(profile.phone);
              setStoreAddress(profile.address);
              setStoreCurrency(profile.currency);
              setStoreLanguage(profile.language);
            } else {
              setStoreName(activeWorkspace.name);
            }
          } catch (profileError) {
            const code =
              profileError instanceof Error
                ? profileError.message
                : "unknown-error";
            setMessage(`${t(storeLanguage, "profileReadFailed")}: ${code}`);
          }
        }
      } catch (error) {
        const code = error instanceof Error ? error.message : "unknown-error";
        setMessage(`${t(storeLanguage, "workspaceReadFailed")}: ${code}`);
      }
    });
  }, []);

  const submit = async () => {
    setMessage("");
    setBusy(true);

    try {
      const credential =
        mode === "login"
          ? await signInWithEmailAndPassword(
              firebaseAuth,
              email.trim(),
              password,
            )
          : await createUserWithEmailAndPassword(
              firebaseAuth,
              email.trim(),
              password,
            );

      setMessage(
        `${t(storeLanguage, "authSuccess")}. UID: ${credential.user.uid}`,
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown-error";
      setMessage(`${t(storeLanguage, "authFailed")}: ${code}`);
    } finally {
      setBusy(false);
    }
  };

  const createWorkspace = async () => {
    if (!currentUser) return;

    setMessage("");
    setBusy(true);

    try {
      const created = await createWorkspaceForCurrentUser(workspaceName);
      setWorkspace(created);
      setStoreName(created.name);
      setMessage(`${t(storeLanguage, "createWorkspace")} • ID: ${created.id}`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown-error";
      setMessage(`${t(storeLanguage, "workspaceCreateFailed")}: ${code}`);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await signOut(firebaseAuth);
    setMessage("");
  };

  return (
    <View style={[styles.container, { direction: rtl ? "rtl" : "ltr" }]}>
      <Text style={styles.title}>{t(storeLanguage, "title")}</Text>
      <Text style={styles.subtitle}>{t(storeLanguage, "subtitle")}</Text>

      {currentUser ? (
        <View style={styles.card}>
          <Text style={styles.success}>{t(storeLanguage, "firebaseOk")}</Text>
          <Text style={styles.uid}>UID: {currentUser.uid}</Text>

          {workspace ? (
            <>
              <View style={styles.workspaceBox}>
                <Text style={[styles.workspaceTitle, { textAlign: rtl ? "right" : "left" }]}>
                  {t(storeLanguage, "workspace")}
                </Text>
                <Text style={styles.workspaceName}>{workspace.name}</Text>
                <Text style={styles.workspaceMeta}>
                  {t(storeLanguage, "role")}: {workspace.role} •{" "}
                  {t(storeLanguage, "id")}: {workspace.id}
                </Text>
              </View>


              <View style={styles.profileBox}>
                <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{t(storeLanguage, "sectionDebts")}</Text>
                <Text style={styles.fieldLabel}>{t(storeLanguage, "chooseCustomer")}</Text>
                <View style={styles.customerPicker}>
                  {customers.filter((customer) => customer.status === "active").map((customer) => (
                    <Pressable key={customer.id} style={[styles.customerChoice, debtCustomerId === customer.id && styles.optionSelected]} onPress={() => setDebtCustomerId(customer.id)}>
                      <Text style={styles.customerChoiceText}>{customer.name}</Text>
                    </Pressable>
                  ))}
                  {customers.filter((customer) => customer.status === "active").length === 0 && <Text style={styles.workspaceMeta}>{t(storeLanguage, "addCustomerFirst")}</Text>}
                </View>
                <TextInput value={debtAmount} onChangeText={setDebtAmount} placeholder=t(storeLanguage, "debtAmount") placeholderTextColor="#7f8790" keyboardType="decimal-pad" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <View style={styles.optionRow}>
                  <Pressable style={[styles.option, debtCurrency === "TRY" && styles.optionSelected]} onPress={() => setDebtCurrency("TRY")}><Text style={styles.optionText}>TRY</Text></Pressable>
                  <Pressable style={[styles.option, debtCurrency === "USD" && styles.optionSelected]} onPress={() => setDebtCurrency("USD")}><Text style={styles.optionText}>USD</Text></Pressable>
                </View>
                <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={async () => {
                  const amount = Number(debtAmount.replace(",", "."));
                  if (!debtCustomerId.trim() || !Number.isFinite(amount) || amount <= 0) { setMessage(t(storeLanguage, "customerAmountRequired")); return; }
                  setBusy(true);
                  try {
                    const amountMinor = Math.round(amount * 100);
                    const result = await createDebt({ workspaceId: workspace.id, customerId: debtCustomerId.trim(), currency: debtCurrency, amountMinor, idempotencyKey: "debt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) });
                    setDebts((current) => [result.debt, ...current]);
                    setDebtAmount("");
                    setMessage(result.replayed ? t(storeLanguage, "debtReplay") : t(storeLanguage, "debtCreated"));
                  } catch (error) { setMessage(t(storeLanguage, "debtCreateFailed") + ": " + (error instanceof Error ? error.message : "unknown-error")); }
                  finally { setBusy(false); }
                }}><Text style={styles.buttonText}>{t(storeLanguage, "recordDebt")}</Text></Pressable>
                {paymentDebtId && (() => {
                  const selectedDebt = debts.find((debt) => debt.id === paymentDebtId);
                  if (!selectedDebt) return null;
                  const customer = customers.find((item) => item.id === selectedDebt.customerId);
                  return <View style={styles.paymentBox}>
                    <Text style={styles.fieldLabel}>دفعة للعميل: {customer?.name ?? selectedDebt.customerId}</Text>
                    <Text style={styles.workspaceMeta}>المتبقي: {((selectedDebt.remainingMinor ?? 0) / 100).toFixed(2)} {selectedDebt.currency}</Text>
                    <TextInput value={paymentAmount} onChangeText={setPaymentAmount} placeholder=t(storeLanguage, "paymentAmount") placeholderTextColor="#7f8790" keyboardType="decimal-pad" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                    <View style={styles.optionRow}>
                      <Pressable style={styles.option} onPress={() => setPaymentDebtId("")}><Text style={styles.optionText}>{t(storeLanguage, "cancel")}</Text></Pressable>
                      <Pressable style={[styles.option, styles.optionSelected]} onPress={async () => {
                        const amount = Number(paymentAmount.replace(",", "."));
                        if (!Number.isFinite(amount) || amount <= 0) { setMessage(t(storeLanguage, "paymentRequired")); return; }
                        setBusy(true);
                        try {
                          const result = await createPayment({
                            workspaceId: workspace.id,
                            debtId: selectedDebt.id,
                            currency: selectedDebt.currency,
                            amountMinor: Math.round(amount * 100),
                            idempotencyKey: "payment-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10),
                          });
                          setDebts(await listDebts(workspace.id));
                          setPaymentAmount("");
                          setPaymentDebtId("");
                          setMessage(result.replayed ? t(storeLanguage, "paymentReplay") : t(storeLanguage, "paymentCreated"));
                        } catch (error) { setMessage(t(storeLanguage, "paymentFailed") + ": " + (error instanceof Error ? error.message : "unknown-error")); }
                        finally { setBusy(false); }
                      }}><Text style={styles.optionText}>{t(storeLanguage, "confirmPayment")}</Text></Pressable>
                    </View>
                  </View>;
                })()}
                <View style={styles.customerList}>
                  {debts.map((debt) => {
                    const customer = customers.find((item) => item.id === debt.customerId);
                    return <View key={debt.id} style={styles.customerRow}>
                      <View style={styles.customerMain}>
                        <Text style={styles.customerName}>{customer?.name ?? debt.customerId}</Text>
                        <Text style={styles.workspaceMeta}>{debt.currency} • {((debt.remainingMinor ?? 0) / 100).toFixed(2)} متبقٍ</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={debt.status === "settled" ? styles.customerActive : styles.workspaceMeta}>{debt.status === "settled" ? t(storeLanguage, "settled") : t(storeLanguage, "open")}</Text>
                        {debt.status === "open" && <Pressable onPress={() => setPaymentDebtId(debt.id)}><Text style={styles.link}>{t(storeLanguage, "recordPayment")}</Text></Pressable>}
                      </View>
                    </View>;
                  })}
                </View>
              </View>

              <View style={styles.profileBox}>
                <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{t(storeLanguage, "sectionCustomers")}</Text>
                <TextInput value={customerName} onChangeText={setCustomerName} placeholder=t(storeLanguage, "customerNameRequiredField") placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <TextInput value={customerPhone} onChangeText={setCustomerPhone} placeholder="الهاتف" placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <TextInput value={customerAddress} onChangeText={setCustomerAddress} placeholder="العنوان" placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <TextInput value={customerNotes} onChangeText={setCustomerNotes} placeholder=t(storeLanguage, "notes") placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={async () => {
                  if (!customerName.trim()) { setMessage(t(storeLanguage, "customerNameRequired")); return; }
                  setBusy(true);
                  try {
                    const created = await createCustomer(workspace.id, { name: customerName, phone: customerPhone, address: customerAddress, notes: customerNotes });
                    setCustomers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
                    setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setCustomerNotes("");
                    setMessage(t(storeLanguage, "customerAdded"));
                  } catch (error) {
                    setMessage(t(storeLanguage, "customerAddFailed") + ": " + (error instanceof Error ? error.message : "unknown-error"));
                  } finally { setBusy(false); }
                }}>
                  <Text style={styles.buttonText}>{t(storeLanguage, "addCustomer")}</Text>
                </Pressable>
                <View style={styles.customerList}>
                  {customers.length === 0 ? <Text style={styles.workspaceMeta}>{t(storeLanguage, "noCustomers")}</Text> :
                    customers.map((customer) => (
                      <View key={customer.id} style={styles.customerRow}>
                        <View style={styles.customerMain}>
                          <Text style={styles.customerName}>{customer.name}</Text>
                          {!!customer.phone && <Text style={styles.workspaceMeta}>{customer.phone}</Text>}
                        </View>
                        <Text style={customer.status === "active" ? styles.customerActive : styles.workspaceMeta}>{customer.status === "active" ? t(storeLanguage, "active") : t(storeLanguage, "archived")}</Text>
                      </View>
                    ))}
                </View>
              </View>
              <View style={styles.profileBox}>
                <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{t(storeLanguage, "sectionCash")}</Text>
                <View style={styles.optionRow}>
                  <Pressable style={[styles.option, cashDirection === "in" && styles.optionSelected]} onPress={() => setCashDirection("in")}><Text style={styles.optionText}>{t(storeLanguage, "in")}</Text></Pressable>
                  <Pressable style={[styles.option, cashDirection === "out" && styles.optionSelected]} onPress={() => setCashDirection("out")}><Text style={styles.optionText}>{t(storeLanguage, "out")}</Text></Pressable>
                </View>
                <View style={styles.optionRow}>
                  <Pressable style={[styles.option, cashCurrency === "TRY" && styles.optionSelected]} onPress={() => setCashCurrency("TRY")}><Text style={styles.optionText}>TRY</Text></Pressable>
                  <Pressable style={[styles.option, cashCurrency === "USD" && styles.optionSelected]} onPress={() => setCashCurrency("USD")}><Text style={styles.optionText}>USD</Text></Pressable>
                </View>
                <TextInput value={cashAmount} onChangeText={setCashAmount} placeholder=t(storeLanguage, "amountRequiredField") placeholderTextColor="#7f8790" keyboardType="decimal-pad" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <TextInput value={cashReason} onChangeText={setCashReason} placeholder=t(storeLanguage, "reasonRequiredField") placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={async () => {
                  const amount = Number(cashAmount.replace(",", "."));
                  if (!Number.isFinite(amount) || amount <= 0 || !cashReason.trim()) { setMessage(t(storeLanguage, "amountReasonRequired")); return; }
                  setBusy(true);
                  try {
                    const result = await createCashMovement({
                      workspaceId: workspace.id,
                      direction: cashDirection,
                      currency: cashCurrency,
                      amountMinor: Math.round(amount * 100),
                      reason: cashReason.trim(),
                      idempotencyKey: "cash-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10),
                    });
                    setCashMovements(await listCashMovements(workspace.id));
                    setCashAmount("");
                    setCashReason("");
                    setMessage(result.replayed ? t(storeLanguage, "cashReplay") : t(storeLanguage, "cashCreated"));
                  } catch (error) {
                    setMessage(t(storeLanguage, "cashFailed") + ": " + (error instanceof Error ? error.message : "unknown-error"));
                  } finally { setBusy(false); }
                }}><Text style={styles.buttonText}>{t(storeLanguage, "recordCash")}</Text></Pressable>
                <View style={styles.customerList}>
                  {cashMovements.map((movement) => (
                    <View key={movement.id} style={styles.customerRow}>
                      <View style={styles.customerMain}>
                        <Text style={styles.customerName}>{movement.direction === "in" ? t(storeLanguage, "in") : t(storeLanguage, "out")} • {movement.reason}</Text>
                        <Text style={styles.workspaceMeta}>{movement.currency} • {(movement.amountMinor / 100).toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                  {cashMovements.length === 0 && <Text style={styles.workspaceMeta}>{t(storeLanguage, "noCash")}</Text>}
                </View>
              </View>

              <View style={styles.profileBox}>
                <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{t(storeLanguage, "sectionJournal")}</Text>
                <View style={styles.optionRow}>
                  <Pressable style={[styles.option, journalDirection === "in" && styles.optionSelected]} onPress={() => setJournalDirection("in")}><Text style={styles.optionText}>{t(storeLanguage, "in")}</Text></Pressable>
                  <Pressable style={[styles.option, journalDirection === "out" && styles.optionSelected]} onPress={() => setJournalDirection("out")}><Text style={styles.optionText}>{t(storeLanguage, "out")}</Text></Pressable>
                </View>
                <View style={styles.optionRow}>
                  <Pressable style={[styles.option, journalCurrency === "TRY" && styles.optionSelected]} onPress={() => setJournalCurrency("TRY")}><Text style={styles.optionText}>TRY</Text></Pressable>
                  <Pressable style={[styles.option, journalCurrency === "USD" && styles.optionSelected]} onPress={() => setJournalCurrency("USD")}><Text style={styles.optionText}>USD</Text></Pressable>
                </View>
                <TextInput value={journalAmount} onChangeText={setJournalAmount} placeholder=t(storeLanguage, "amountRequiredField") placeholderTextColor="#7f8790" keyboardType="decimal-pad" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <TextInput value={journalReason} onChangeText={setJournalReason} placeholder=t(storeLanguage, "reasonRequiredField") placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={async () => {
                  const amount = Number(journalAmount.replace(",", "."));
                  if (!Number.isFinite(amount) || amount <= 0 || !journalReason.trim()) { setMessage(t(storeLanguage, "amountReasonRequired")); return; }
                  setBusy(true);
                  try {
                    const result = await createJournalEntry({
                      workspaceId: workspace.id,
                      direction: journalDirection,
                      currency: journalCurrency,
                      amountMinor: Math.round(amount * 100),
                      reason: journalReason.trim(),
                      idempotencyKey: "journal-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10),
                    });
                    setJournalEntries(await listJournalEntries(workspace.id));
                    setJournalAmount("");
                    setJournalReason("");
                    setMessage(result.replayed ? t(storeLanguage, "journalReplay") : t(storeLanguage, "journalCreated"));
                  } catch (error) {
                    setMessage(t(storeLanguage, "journalFailed") + ": " + (error instanceof Error ? error.message : "unknown-error"));
                  } finally { setBusy(false); }
                }}><Text style={styles.buttonText}>{t(storeLanguage, "recordJournal")}</Text></Pressable>
                <View style={styles.customerList}>
                  {journalEntries.map((entry) => (
                    <View key={entry.id} style={styles.customerRow}>
                      <View style={styles.customerMain}>
                        <Text style={styles.customerName}>{entry.direction === "in" ? t(storeLanguage, "in") : t(storeLanguage, "out")} • {entry.reason}</Text>
                        <Text style={styles.workspaceMeta}>{entry.currency} • {(entry.amountMinor / 100).toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                  {journalEntries.length === 0 && <Text style={styles.workspaceMeta}>{t(storeLanguage, "noJournal")}</Text>}
                </View>
              </View>

              <View style={styles.profileBox}>
                <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{t(storeLanguage, "sectionClosing")}</Text>
                {workspace.role === "owner" || workspace.role === "admin" ? <>
                  <TextInput value={closingTry} onChangeText={setClosingTry} placeholder=t(storeLanguage, "actualTry") placeholderTextColor="#7f8790" keyboardType="decimal-pad" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                  <TextInput value={closingUsd} onChangeText={setClosingUsd} placeholder=t(storeLanguage, "actualUsd") placeholderTextColor="#7f8790" keyboardType="decimal-pad" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                  <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={async () => {
                    const tryAmount = Number(closingTry.replace(",", "."));
                    const usdAmount = closingUsd.trim() ? Number(closingUsd.replace(",", ".")) : 0;
                    if (!Number.isFinite(tryAmount) || tryAmount < 0 || !Number.isFinite(usdAmount) || usdAmount < 0 || (!closingTry.trim() && !closingUsd.trim())) {
                      setMessage(t(storeLanguage, "balanceRequired"));
                      return;
                    }
                    setBusy(true);
                    try {
                      const balances: Partial<Record<"TRY" | "USD", number>> = {};
                      if (closingTry.trim()) balances.TRY = Math.round(tryAmount * 100);
                      if (closingUsd.trim()) balances.USD = Math.round(usdAmount * 100);
                      const closingDate = new Date().toLocaleDateString("en-CA");
                      const result = await closeDay({
                        workspaceId: workspace.id,
                        closingDate,
                        balances,
                        idempotencyKey: "closing-" + closingDate,
                      });
                      setDailyClosings(await listDailyClosings(workspace.id));
                      setClosingTry("");
                      setClosingUsd("");
                      setMessage(result.replayed ? t(storeLanguage, "closingReplay") : t(storeLanguage, "closedDay"));
                    } catch (error) {
                      setMessage(t(storeLanguage, "closingFailed") + ": " + (error instanceof Error ? error.message : "unknown-error"));
                    } finally { setBusy(false); }
                  }}><Text style={styles.buttonText}>{t(storeLanguage, "sectionClosing")}</Text></Pressable>
                </> : <Text style={styles.workspaceMeta}>{t(storeLanguage, "ownerAdminOnly")}</Text>}
                <View style={styles.customerList}>
                  {dailyClosings.slice(0, 5).map((closing) => (
                    <View key={closing.id} style={styles.customerRow}>
                      <View style={styles.customerMain}>
                        <Text style={styles.customerName}>{closing.closingDate}</Text>
                        <Text style={styles.workspaceMeta}>
                          {closing.balances.TRY !== undefined ? "TRY • " + (closing.balances.TRY / 100).toFixed(2) : ""}
                          {closing.balances.TRY !== undefined && closing.balances.USD !== undefined ? "   " : ""}
                          {closing.balances.USD !== undefined ? "USD • " + (closing.balances.USD / 100).toFixed(2) : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {dailyClosings.length === 0 && <Text style={styles.workspaceMeta}>{t(storeLanguage, "noClosings")}</Text>}
                </View>
              </View>

              <View style={styles.profileBox}>
                <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{t(storeLanguage, "sectionReminders")}</Text>
                <TextInput value={reminderTitle} onChangeText={setReminderTitle} placeholder=t(storeLanguage, "reminderTitleField") placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <TextInput value={reminderNote} onChangeText={setReminderNote} placeholder=t(storeLanguage, "reminderNoteField") placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <TextInput value={reminderDueAt} onChangeText={setReminderDueAt} placeholder=t(storeLanguage, "reminderDuePlaceholder") placeholderTextColor="#7f8790" style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
                <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={async () => {
                  if (!reminderTitle.trim()) { setMessage(t(storeLanguage, "reminderTitleRequired")); return; }
                  const dueAtMs = Date.parse(reminderDueAt.trim());
                  if (!Number.isFinite(dueAtMs) || dueAtMs <= Date.now()) { setMessage(t(storeLanguage, "reminderFutureRequired")); return; }
                  setBusy(true);
                  try {
                    const result = await createReminder({
                      workspaceId: workspace.id,
                      title: reminderTitle.trim(),
                      note: reminderNote.trim(),
                      dueAtMs,
                      idempotencyKey: "reminder-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10),
                    });
                    setReminders(await listReminders(workspace.id));
                    setReminderTitle("");
                    setReminderNote("");
                    setReminderDueAt("");
                    setMessage(result.replayed ? t(storeLanguage, "reminderReplay") : t(storeLanguage, "reminderCreated"));
                  } catch (error) {
                    setMessage(t(storeLanguage, "reminderFailed") + ": " + (error instanceof Error ? error.message : "unknown-error"));
                  } finally { setBusy(false); }
                }}><Text style={styles.buttonText}>{t(storeLanguage, "addReminder")}</Text></Pressable>
                <View style={styles.customerList}>
                  {reminders.slice(0, 10).map((reminder) => (
                    <View key={reminder.id} style={styles.customerRow}>
                      <View style={styles.customerMain}>
                        <Text style={styles.customerName}>{reminder.title}</Text>
                        <Text style={styles.workspaceMeta}>{reminder.status} • {String(reminder.dueAt)}</Text>
                      </View>
                    </View>
                  ))}
                  {reminders.length === 0 && <Text style={styles.workspaceMeta}>{t(storeLanguage, "noReminders")}</Text>}
                </View>
              </View>

              <View style={styles.profileBox}>
                <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{t(storeLanguage, "sectionArchive")}</Text>
                <Text style={styles.workspaceMeta}>{t(storeLanguage, "archiveReadOnly")}</Text>
                <View style={styles.customerList}>
                  {archiveRecords.slice(0, 10).map((record) => (
                    <View key={record.id} style={styles.customerRow}>
                      <View style={styles.customerMain}>
                        <Text style={styles.customerName}>{record.sourceType}</Text>
                        <Text style={styles.workspaceMeta}>{record.sourceId} • {record.reason}</Text>
                      </View>
                    </View>
                  ))}
                  {archiveRecords.length === 0 && <Text style={styles.workspaceMeta}>{t(storeLanguage, "noArchive")}</Text>}
                </View>
              </View>

              <View style={styles.profileBox}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { textAlign: rtl ? "right" : "left" },
                  ]}
                >
                  {t(storeLanguage, "storeData")}
                </Text>

                <TextInput
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder={t(storeLanguage, "storeName")}
                  placeholderTextColor="#7f8790"
                  style={[
                    styles.input,
                    { textAlign: rtl ? "right" : "left" },
                  ]}
                />

                <TextInput
                  value={storePhone}
                  onChangeText={setStorePhone}
                  placeholder={t(storeLanguage, "phone")}
                  placeholderTextColor="#7f8790"
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    { textAlign: rtl ? "right" : "left" },
                  ]}
                />

                <TextInput
                  value={storeAddress}
                  onChangeText={setStoreAddress}
                  placeholder={t(storeLanguage, "address")}
                  placeholderTextColor="#7f8790"
                  style={[
                    styles.input,
                    { textAlign: rtl ? "right" : "left" },
                  ]}
                />

                <View style={styles.optionRow}>
                  <Pressable
                    style={[
                      styles.option,
                      storeCurrency === "TRY" && styles.optionSelected,
                    ]}
                    onPress={() => setStoreCurrency("TRY")}
                  >
                    <Text style={styles.optionText}>TRY</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.option,
                      storeCurrency === "USD" && styles.optionSelected,
                    ]}
                    onPress={() => setStoreCurrency("USD")}
                  >
                    <Text style={styles.optionText}>USD</Text>
                  </Pressable>
                </View>

                <View style={styles.optionRow}>
                  <Pressable
                    style={[
                      styles.option,
                      storeLanguage === "ar" && styles.optionSelected,
                    ]}
                    onPress={() => {
                      setStoreLanguage("ar");
                      setProfileSaved(false);
                    }}
                  >
                    <Text style={styles.optionText}>العربية</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.option,
                      storeLanguage === "tr" && styles.optionSelected,
                    ]}
                    onPress={() => {
                      setStoreLanguage("tr");
                      setProfileSaved(false);
                    }}
                  >
                    <Text style={styles.optionText}>Türkçe</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.option,
                      storeLanguage === "en" && styles.optionSelected,
                    ]}
                    onPress={() => {
                      setStoreLanguage("en");
                      setProfileSaved(false);
                    }}
                  >
                    <Text style={styles.optionText}>English</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.button, busy && styles.disabled]}
                  disabled={busy || workspace.role === "staff"}
                  onPress={async () => {
                    setBusy(true);
                    setProfileSaved(false);

                    try {
                      await saveStoreProfile(workspace.id, {
                        name: storeName,
                        phone: storePhone,
                        address: storeAddress,
                        currency: storeCurrency,
                        language: storeLanguage,
                      });
                      setProfileSaved(true);
                    } catch (error) {
                      const code =
                        error instanceof Error
                          ? error.message
                          : "unknown-error";
                      setMessage(
                        `${t(storeLanguage, "profileSaveFailed")}: ${code}`,
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>
                    {busy
                      ? t(storeLanguage, "saving")
                      : t(storeLanguage, "saveStore")}
                  </Text>
                </Pressable>

                {profileSaved && (
                  <Text style={styles.saved}>
                    {t(storeLanguage, "saved")}
                  </Text>
                )}
              </View>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  { textAlign: rtl ? "right" : "left" },
                ]}
              >
                {t(storeLanguage, "firstWorkspace")}
              </Text>

              <TextInput
                value={workspaceName}
                onChangeText={setWorkspaceName}
                placeholder={t(storeLanguage, "storeName")}
                placeholderTextColor="#7f8790"
                style={[
                  styles.input,
                  { textAlign: rtl ? "right" : "left" },
                ]}
              />

              <Pressable
                style={[styles.button, busy && styles.disabled]}
                onPress={createWorkspace}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#111315" />
                ) : (
                  <Text style={styles.buttonText}>
                    {t(storeLanguage, "createWorkspace")}
                  </Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            style={[styles.secondaryButton, busy && styles.disabled]}
            onPress={logout}
            disabled={busy}
          >
            <Text style={styles.secondaryButtonText}>
              {t(storeLanguage, "logout")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t(storeLanguage, "email")}
            placeholderTextColor="#7f8790"
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { textAlign: rtl ? "right" : "left" }]}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t(storeLanguage, "password")}
            placeholderTextColor="#7f8790"
            secureTextEntry
            style={[styles.input, { textAlign: rtl ? "right" : "left" }]}
          />

          <Pressable
            style={[styles.button, busy && styles.disabled]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#111315" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "login"
                  ? t(storeLanguage, "login")
                  : t(storeLanguage, "createTestAccount")}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            <Text style={styles.link}>
              {mode === "login"
                ? t(storeLanguage, "noAccount")
                : t(storeLanguage, "haveAccount")}
            </Text>
          </Pressable>
        </View>
      )}

      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#111315",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#111315",
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#aeb4bb",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#191c20",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#3a4048",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#ffffff",
    backgroundColor: "#111315",
    marginBottom: 12,
  },
  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d4a72c",
    marginTop: 4,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252a30",
    marginTop: 12,
  },
  disabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#111315",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  link: {
    color: "#d4a72c",
    textAlign: "center",
    marginTop: 18,
    fontSize: 14,
  },
  success: {
    color: "#75d69c",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  uid: {
    color: "#aeb4bb",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },
  workspaceBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3a4048",
    backgroundColor: "#111315",
  },
  workspaceTitle: {
    color: "#d4a72c",
    fontSize: 13,
  },
  workspaceName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  profileBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3a4048",
    backgroundColor: "#111315",
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  option: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#3a4048",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionSelected: {
    borderColor: "#d4a72c",
    backgroundColor: "#2a2515",
  },
  optionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  saved: {
    color: "#75d69c",
    textAlign: "center",
    marginTop: 10,
  },
  workspaceMeta: {
    color: "#aeb4bb",
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },
  fieldLabel: { color: "#d4a72c", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  customerPicker: { gap: 8, marginBottom: 12 },
  customerChoice: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#3a4048", justifyContent: "center", backgroundColor: "#191c20" },
  customerChoiceText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  paymentBox: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#d4a72c", backgroundColor: "#211d10" },
  customerList: { marginTop: 14, gap: 8 },
  customerRow: { minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#30363d", backgroundColor: "#191c20", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  customerMain: { flex: 1 },
  customerName: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  customerActive: { color: "#75d69c", fontSize: 12, fontWeight: "600" },
  message: {
    color: "#e1e5e9",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
