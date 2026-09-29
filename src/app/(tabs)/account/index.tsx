import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../lib/auth";
import { API_URL } from "../../../lib/nucleus";
import { useCurrentUser } from "../../../lib/use-current-user";

export default function Account() {
  const { signOut } = useAuth();
  const { user, error, retry } = useCurrentUser();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {user ? (
          <>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </>
        ) : error ? (
          <View style={styles.errorRow}>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={retry}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator />
        )}
      </View>

      <Text style={styles.server}>Signed in to {API_URL}</Text>

      <Pressable
        testID="account-logout"
        accessibilityRole="button"
        style={styles.button}
        onPress={signOut}
      >
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    padding: 20,
    gap: 4,
  },
  name: { fontSize: 20, fontWeight: "700", color: "#1A1D21" },
  email: { fontSize: 15, color: "#5B6470" },
  server: { fontSize: 12, color: "#9AA1A9", paddingHorizontal: 4 },
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
    marginTop: 12,
  },
  buttonText: { color: "#D64545", fontWeight: "600", fontSize: 16 },
});
