import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useCredentials } from "../lib/wallet-store";

export default function Home() {
  const [offerUri, setOfferUri] = useState("");
  const credentials = useCredentials();

  const canReceive = offerUri.trim().length > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Accredify Wallet" }} />

      <Text style={styles.label}>Credential offer</Text>
      <TextInput
        style={styles.input}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="openid-credential-offer://…"
        placeholderTextColor="#9AA1A9"
        value={offerUri}
        onChangeText={setOfferUri}
      />
      <Pressable
        style={[styles.button, !canReceive && styles.buttonDisabled]}
        disabled={!canReceive}
        onPress={() =>
          router.push({ pathname: "/receive", params: { offer: offerUri.trim() } })
        }
      >
        <Text style={styles.buttonText}>Receive credential</Text>
      </Pressable>

      <Text style={styles.label}>Received credentials</Text>
      {credentials.length === 0 && (
        <Text style={styles.empty}>
          Nothing yet. Paste a pre-authorized credential offer from an issuer (e.g.
          playground.animo.id) to receive your first mdoc.
        </Text>
      )}
      {credentials.map((credential, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {credential.decoded.doctype ?? credential.credentialConfigurationId}
            </Text>
            <Text style={styles.badge}>mso_mdoc</Text>
          </View>
          {credential.decoded.claims.slice(0, 4).map((claim) => (
            <Text key={`${claim.namespace}/${claim.elementIdentifier}`} style={styles.claim}>
              {claim.elementIdentifier}: {claim.elementValue}
            </Text>
          ))}
          {credential.decoded.claims.length > 4 && (
            <Text style={styles.claim}>… {credential.decoded.claims.length - 4} more</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#5B6470", marginTop: 12 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    padding: 12,
    minHeight: 88,
    fontSize: 13,
    color: "#1A1D21",
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  empty: { color: "#9AA1A9", fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    padding: 12,
    gap: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "600", fontSize: 14, color: "#1A1D21", flexShrink: 1 },
  badge: {
    fontSize: 11,
    color: "#208AEF",
    backgroundColor: "#E6F4FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  claim: { fontSize: 12, color: "#5B6470" },
});
