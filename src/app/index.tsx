import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { firebaseAuth } from "@/lib/firebase";

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");

  const submit = async () => {
    setMessage("");
    setBusy(true);

    try {
      const credential =
        mode === "login"
          ? await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
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

  const logout = async () => {
    await signOut(firebaseAuth);
    setMessage("تم تسجيل الخروج.");
  };

  const currentUser = firebaseAuth.currentUser;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accounting Assistant</Text>
      <Text style={styles.subtitle}>اختبار الاتصال بـ Firebase</Text>

      {currentUser ? (
        <View style={styles.card}>
          <Text style={styles.success}>Firebase يعمل بنجاح</Text>
          <Text style={styles.uid}>UID: {currentUser.uid}</Text>
          <Pressable style={styles.button} onPress={logout}>
            <Text style={styles.buttonText}>تسجيل الخروج</Text>
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
              <ActivityIndicator color="#ffffff" />
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
  disabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#111315",
    fontSize: 16,
    fontWeight: "700",
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
  message: {
    color: "#e1e5e9",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
