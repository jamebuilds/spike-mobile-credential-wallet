import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { me, NucleusError, type NucleusUser } from "../lib/nucleus";

export default function Profile() {
  const { session, signOut } = useAuth();
  const [user, setUser] = useState<NucleusUser | undefined>(session?.user);
  const [error, setError] = useState<string>();
  // Login and restore already fetched the user; only a session restored
  // offline arrives without one
  const [loading, setLoading] = useState(!session?.user);

  const fetchUser = () => {
    if (!session) return;
    me(session.token)
      .then(setUser)
      .catch((e) => {
        if (e instanceof NucleusError && e.status === 401) signOut();
        else setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  };

  const retry = () => {
    setLoading(true);
    setError(undefined);
    fetchUser();
  };

  useEffect(() => {
    if (!session?.user) fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.screen}>
      {user ? (
        <View style={styles.card}>
          <Text testID="profile-welcome" style={styles.welcome}>
            Welcome, {user.name}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator />
      ) : null}
      {error && (
        <View style={styles.errorRow}>
          <Text testID="profile-error" style={styles.error}>
            {error}
          </Text>
          <Pressable testID="profile-retry" accessibilityRole="button" onPress={retry}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        testID="profile-logout"
        accessibilityRole="button"
        style={styles.button}
        onPress={signOut}
      >
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8", padding: 24, gap: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    padding: 20,
    gap: 4,
  },
  welcome: { fontSize: 22, fontWeight: "700", color: "#1A1D21" },
  email: { fontSize: 15, color: "#5B6470" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  error: { color: "#D64545", fontSize: 14, flexShrink: 1 },
  retry: { color: "#4962E1", fontSize: 14, fontWeight: "600" },
  button: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    backgroundColor: "#FFFFFF",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#D64545", fontWeight: "600", fontSize: 16 },
});
