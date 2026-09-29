import { Image } from "expo-image";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { NucleusCredential } from "../../../lib/nucleus";
import { useCredentials } from "../../../lib/use-credentials";
import { useCurrentUser } from "../../../lib/use-current-user";

export default function Profile() {
  const { user, error: userError, retry: retryUser } = useCurrentUser();
  const { credentials, total, status, error, refresh, loadMore, retry } = useCredentials();

  const shownError = error ?? userError;
  const retryAll = () => {
    if (!user) retryUser();
    retry();
  };

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={credentials}
      keyExtractor={(credential) => credential.id}
      renderItem={({ item }) => <CredentialRow credential={item} />}
      refreshing={status === "refreshing"}
      onRefresh={refresh}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.card}>
            {user ? (
              <>
                <Text testID="profile-welcome" style={styles.welcome}>
                  Welcome, {user.name}
                </Text>
                <Text style={styles.email}>{user.email}</Text>
              </>
            ) : (
              <ActivityIndicator />
            )}
          </View>
          <Text style={styles.sectionTitle}>
            Credentials{total !== undefined ? ` · ${total}` : ""}
          </Text>
        </View>
      }
      ListEmptyComponent={
        status === "loading" ? (
          <ActivityIndicator style={styles.spinner} />
        ) : shownError ? null : (
          <Text style={styles.empty}>No credentials yet</Text>
        )
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {status === "loadingMore" && <ActivityIndicator />}
          {shownError && (
            <View style={styles.errorRow}>
              <Text testID="profile-error" style={styles.error}>
                {shownError}
              </Text>
              <Pressable testID="profile-retry" accessibilityRole="button" onPress={retryAll}>
                <Text style={styles.retry}>Retry</Text>
              </Pressable>
            </View>
          )}
        </View>
      }
    />
  );
}

function CredentialRow({ credential }: { credential: NucleusCredential }) {
  const expired = isPast(credential.expires_at);
  return (
    <View style={styles.row}>
      <View style={styles.logoFrame}>
        {credential.logo_url && (
          <Image
            source={credential.logo_url}
            style={styles.logo}
            contentFit="contain"
            transition={150}
          />
        )}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.title} numberOfLines={2}>
          {credential.title}
        </Text>
        {credential.subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {credential.subtitle}
          </Text>
        )}
        {credential.issued_at && (
          <Text style={styles.meta}>Issued {formatDate(credential.issued_at)}</Text>
        )}
        <View style={styles.badges}>
          <Text style={[styles.badge, styles.formatBadge]}>{credential.document_type}</Text>
          {credential.is_verified && (
            <Text style={[styles.badge, styles.verifiedBadge]}>Verified</Text>
          )}
          {expired && <Text style={[styles.badge, styles.expiredBadge]}>Expired</Text>}
        </View>
      </View>
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isPast(iso: string | null): boolean {
  return iso !== null && new Date(iso).getTime() < Date.now();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, gap: 10 },
  header: { gap: 16, marginBottom: 2 },
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
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#5B6470", textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    padding: 12,
  },
  logoFrame: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#EEF0F3",
    overflow: "hidden",
  },
  logo: { width: 48, height: 48 },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "600", color: "#1A1D21" },
  subtitle: { fontSize: 13, color: "#5B6470" },
  meta: { fontSize: 12, color: "#9AA1A9" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  formatBadge: { color: "#4962E1", backgroundColor: "#ECEFFC" },
  verifiedBadge: { color: "#1F9D55", backgroundColor: "#E6F6EC" },
  expiredBadge: { color: "#D64545", backgroundColor: "#FDECEC" },
  spinner: { marginTop: 24 },
  empty: { color: "#9AA1A9", fontSize: 14, textAlign: "center", marginTop: 24 },
  footer: { paddingVertical: 8, gap: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  error: { color: "#D64545", fontSize: 14, flexShrink: 1 },
  retry: { color: "#4962E1", fontSize: 14, fontWeight: "600" },
});
