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
} from "react-native";
import { firebaseAuth } from "@/lib/firebase";
import { getStoreProfile, saveStoreProfile, type StoreCurrency, type StoreLanguage } from "@/lib/store-profile";
import {
  createWorkspaceForCurrentUser,
  getActiveWorkspaceForCurrentUser,
  type WorkspaceSummary,
} from "@/lib/workspace";

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("متجري");
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
  const [storeLanguage, setStoreLanguage] = useState<StoreLanguage>("ar");
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      setCurrentUser(user);
      setWorkspace(null);

      if (!user) {
        return;
      }

      try {
        const activeWorkspace = await getActiveWorkspaceForCurrentUser();
        setWorkspace(activeWorkspace);
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
            const code = profileError instanceof Error ? profileError.message : "unknown-error";
            setMessage(`تعذر قراءة بيانات المتجر: ${code}`);
          }
        }
      } catch (error) {
        const code = error instanceof Error ? error.message : "unknown-error";
        setMessage(`تعذر قراءة مساحة العمل: ${code}`);
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

      setMessage(`تم الاتصال بـ Firebase بنجاح. UID: ${credential.user.uid}`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown-error";
      setMessage(`فشل الاتصال أو المصادقة: ${code}`);
    } finally {
      setBusy(false);
    }
  };

  const createWorkspace = async () => {
    if (!currentUser) {
      return;
    }

    setMessage("");
    setBusy(true);

    try {
      const created = await createWorkspaceForCurrentUser(workspaceName);
      setWorkspace(created);
      setMessage(`تم إنشاء مساحة العمل بنجاح. ID: ${created.id}`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown-error";
      setMessage(`فشل إنشاء مساحة العمل: ${code}`);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await signOut(firebaseAuth);
    setMessage("تم تسجيل الخروج.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accounting Assistant</Text>
      <Text style={styles.subtitle}>أساس الحساب السحابي</Text>

      {currentUser ? (
        <View style={styles.card}>
          <Text style={styles.success}>Firebase يعمل بنجاح</Text>
          <Text style={styles.uid}>UID: {currentUser.uid}</Text>

          {workspace ? (
            <>
              <View style={styles.workspaceBox}>
              <Text style={styles.workspaceTitle}>مساحة العمل</Text>
              <Text style={styles.workspaceName}>{workspace.name}</Text>
              <Text style={styles.workspaceMeta}>
                الدور: {workspace.role} • ID: {workspace.id}
              </Text>
            </View>

            <View style={styles.profileBox}>
              <Text style={styles.sectionTitle}>بيانات المتجر</Text>
              <TextInput value={storeName} onChangeText={setStoreName} placeholder="اسم المتجر" placeholderTextColor="#7f8790" style={styles.input} />
              <TextInput value={storePhone} onChangeText={setStorePhone} placeholder="رقم الهاتف" placeholderTextColor="#7f8790" keyboardType="phone-pad" style={styles.input} />
              <TextInput value={storeAddress} onChangeText={setStoreAddress} placeholder="العنوان" placeholderTextColor="#7f8790" style={styles.input} />
              <View style={styles.optionRow}>
                <Pressable style={[styles.option, storeCurrency === "TRY" && styles.optionSelected]} onPress={() => setStoreCurrency("TRY")}><Text style={styles.optionText}>TRY</Text></Pressable>
                <Pressable style={[styles.option, storeCurrency === "USD" && styles.optionSelected]} onPress={() => setStoreCurrency("USD")}><Text style={styles.optionText}>USD</Text></Pressable>
              </View>
              <View style={styles.optionRow}>
                <Pressable style={[styles.option, storeLanguage === "ar" && styles.optionSelected]} onPress={() => setStoreLanguage("ar")}><Text style={styles.optionText}>العربية</Text></Pressable>
                <Pressable style={[styles.option, storeLanguage === "tr" && styles.optionSelected]} onPress={() => setStoreLanguage("tr")}><Text style={styles.optionText}>Türkçe</Text></Pressable>
                <Pressable style={[styles.option, storeLanguage === "en" && styles.optionSelected]} onPress={() => setStoreLanguage("en")}><Text style={styles.optionText}>English</Text></Pressable>
              </View>
              <Pressable
                style={[styles.button, busy && styles.disabled]}
                disabled={busy || workspace.role === "staff"}
                onPress={async () => {
                  setBusy(true);
                  setProfileSaved(false);
                  try {
                    await saveStoreProfile(workspace.id, { name: storeName, phone: storePhone, address: storeAddress, currency: storeCurrency, language: storeLanguage });
                    setProfileSaved(true);
                  } catch (error) {
                    const code = error instanceof Error ? error.message : "unknown-error";
                    setMessage(`فشل حفظ بيانات المتجر: ${code}`);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Text style={styles.buttonText}>{busy ? "جارٍ الحفظ..." : "حفظ بيانات المتجر"}</Text>
              </Pressable>
              {profileSaved && <Text style={styles.saved}>تم حفظ بيانات المتجر</Text>}
            </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>إنشاء مساحة العمل الأولى</Text>
              <TextInput
                value={workspaceName}
                onChangeText={setWorkspaceName}
                placeholder="اسم المتجر"
                placeholderTextColor="#7f8790"
                style={styles.input}
              />
              <Pressable
                style={[styles.button, busy && styles.disabled]}
                onPress={createWorkspace}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#111315" />
                ) : (
                  <Text style={styles.buttonText}>إنشاء مساحة العمل</Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            style={[styles.secondaryButton, busy && styles.disabled]}
            onPress={logout}
            disabled={busy}
          >
            <Text style={styles.secondaryButtonText}>تسجيل الخروج</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="البريد الإلكتروني"
            placeholderTextColor="#7f8790"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="كلمة المرور"
            placeholderTextColor="#7f8790"
            secureTextEntry
            style={styles.input}
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
                {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب اختبار"}
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
                ? "ليس لديك حساب؟ إنشاء حساب اختبار"
                : "لديك حساب؟ تسجيل الدخول"}
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
    flex: 1,
    justifyContent: "center",
    padding: 24,
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
    textAlign: "left",
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
    textAlign: "right",
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
    textAlign: "center",
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
  message: {
    color: "#e1e5e9",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
