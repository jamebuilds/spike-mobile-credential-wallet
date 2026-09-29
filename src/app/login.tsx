import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  // Ref latches synchronously so a same-tick double tap can't send two requests
  const inFlight = useRef(false);
  const passwordInput = useRef<TextInput>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleLogin = async () => {
    if (!canSubmit || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/nucleus-logo.svg")}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Nucleus logo"
          />
          <Text style={styles.title}>Nucleus</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            testID="login-email"
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9AA1A9"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordInput.current?.focus()}
            editable={!submitting}
          />
          <TextInput
            ref={passwordInput}
            testID="login-password"
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9AA1A9"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!submitting}
          />

          {error && (
            <Text testID="login-error" style={styles.error}>
              {error}
            </Text>
          )}

          <Pressable
            testID="login-submit"
            accessibilityRole="button"
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            disabled={!canSubmit}
            onPress={handleLogin}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Log in</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 32 },
  header: { alignItems: "center", gap: 8 },
  logo: { width: 64, height: 62 },
  title: { fontSize: 28, fontWeight: "700", color: "#1A1D21", marginTop: 8 },
  subtitle: { fontSize: 15, color: "#5B6470" },
  form: { gap: 12 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1A1D21",
  },
  error: { color: "#D64545", fontSize: 14 },
  button: {
    backgroundColor: "#4962E1",
    borderRadius: 10,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
