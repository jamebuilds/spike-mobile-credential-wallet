import { Oauth2ClientErrorResponseError } from "@openid4vc/oauth2";
import { Openid4vciRetrieveCredentialsError } from "@openid4vc/openid4vci";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  requestCredential,
  resolveOffer,
  type ReceivedCredential,
  type ResolvedOffer,
  type StepName,
} from "../lib/oid4vci";
import { saveCredential } from "../lib/wallet-store";

const STEP_ORDER: StepName[] = [
  "Credential offer",
  "Issuer metadata",
  "Token request",
  "Nonce",
  "Proof JWT",
  "Credential request",
];

type StepStatus = "pending" | "running" | "done" | "error";

interface Trace {
  [step: string]: { status: StepStatus; detail?: unknown };
}

type Phase =
  | { kind: "resolving" }
  | { kind: "choose"; resolved: ResolvedOffer }
  | { kind: "requesting" }
  | { kind: "done"; credential: ReceivedCredential }
  | { kind: "error"; message: string };

export default function Receive() {
  const { offer: offerUri } = useLocalSearchParams<{ offer?: string }>();
  const [phase, setPhase] = useState<Phase>(() =>
    offerUri
      ? { kind: "resolving" }
      : { kind: "error", message: "No credential offer was provided" },
  );
  const [trace, setTrace] = useState<Trace>(
    (): Trace => (offerUri ? { "Credential offer": { status: "running" } } : {}),
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>();
  const [pin, setPin] = useState("");
  const resolvedRef = useRef<ResolvedOffer>(null);

  const markStep = (name: StepName, detail: unknown) =>
    setTrace((current) => {
      const next: Trace = { ...current, [name]: { status: "done", detail } };
      const following = STEP_ORDER[STEP_ORDER.indexOf(name) + 1];
      if (following && next[following]?.status !== "done") {
        next[following] = { status: "running" };
      }
      return next;
    });

  const fail = (error: unknown) => {
    setTrace((current) => {
      const running = STEP_ORDER.find((step) => current[step]?.status === "running");
      return running
        ? { ...current, [running]: { ...current[running], status: "error" } }
        : current;
    });
    setPhase({ kind: "error", message: describeError(error) });
  };

  const continueFlow = (resolved: ResolvedOffer, configurationId: string, txCode?: string) => {
    setPhase({ kind: "requesting" });
    setTrace((current) => ({ ...current, "Token request": { status: "running" } }));
    requestCredential({
      offer: resolved.offer,
      issuerMetadata: resolved.issuerMetadata,
      credentialConfigurationId: configurationId,
      txCode,
      onStep: markStep,
    })
      .then((credential) => setPhase({ kind: "done", credential }))
      .catch(fail);
  };

  useEffect(() => {
    if (!offerUri) return;
    resolveOffer(offerUri, markStep)
      .then((resolved) => {
        if (resolved.mdocConfigurations.length === 0) {
          throw new Error(
            "This offer contains no mso_mdoc credentials — only the mdoc format is supported in this spike",
          );
        }
        resolvedRef.current = resolved;
        setSelectedId(resolved.mdocConfigurations[0].id);
        // Nothing for the user to decide → continue straight to the token request
        if (resolved.mdocConfigurations.length === 1 && !resolved.txCode) {
          continueFlow(resolved, resolved.mdocConfigurations[0].id, undefined);
        } else {
          setPhase({ kind: "choose", resolved });
        }
      })
      .catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerUri]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Receive credential" }} />

      <Text style={styles.heading}>Protocol trace</Text>
      {STEP_ORDER.map((step, index) => {
        const state = trace[step] ?? { status: "pending" as StepStatus };
        const isExpanded = expanded.has(step);
        return (
          <Pressable
            key={step}
            style={styles.stepRow}
            disabled={state.detail === undefined}
            onPress={() =>
              setExpanded((current) => {
                const next = new Set(current);
                if (next.has(step)) next.delete(step);
                else next.add(step);
                return next;
              })
            }
          >
            <View style={styles.stepHeader}>
              <StatusIcon status={state.status} />
              <Text style={styles.stepName}>
                {index + 1}. {step}
              </Text>
              {state.detail !== undefined && (
                <Text style={styles.chevron}>{isExpanded ? "▾" : "▸"}</Text>
              )}
            </View>
            {isExpanded && state.detail !== undefined && (
              <Text style={styles.detail}>{JSON.stringify(state.detail, null, 2)}</Text>
            )}
          </Pressable>
        );
      })}

      {phase.kind === "choose" && (
        <View style={styles.panel}>
          <Text style={styles.heading}>Pick a credential</Text>
          {phase.resolved.mdocConfigurations.map((configuration) => (
            <Pressable
              key={configuration.id}
              style={styles.option}
              onPress={() => setSelectedId(configuration.id)}
            >
              <Text style={styles.radio}>{selectedId === configuration.id ? "◉" : "○"}</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>
                  {configuration.displayName ?? configuration.id}
                </Text>
                {configuration.doctype && (
                  <Text style={styles.optionSubtitle}>{configuration.doctype}</Text>
                )}
              </View>
            </Pressable>
          ))}
          {phase.resolved.txCode && (
            <>
              <Text style={styles.label}>
                {phase.resolved.txCode.description ?? "Transaction code (PIN)"}
              </Text>
              <TextInput
                style={styles.input}
                value={pin}
                onChangeText={setPin}
                keyboardType={
                  phase.resolved.txCode.input_mode === "text" ? "default" : "number-pad"
                }
                maxLength={phase.resolved.txCode.length ?? undefined}
                autoCapitalize="none"
              />
            </>
          )}
          <Pressable
            style={[styles.button, !selectedId && styles.buttonDisabled]}
            disabled={!selectedId}
            onPress={() =>
              continueFlow(phase.resolved, selectedId!, phase.resolved.txCode ? pin : undefined)
            }
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {phase.kind === "done" && (
        <View style={styles.panel}>
          <View style={styles.cardHeader}>
            <Text style={styles.heading}>
              {phase.credential.decoded.doctype ?? phase.credential.credentialConfigurationId}
            </Text>
            <Text style={styles.badge}>mso_mdoc</Text>
          </View>
          {groupByNamespace(phase.credential).map(([namespace, claims]) => (
            <View key={namespace} style={styles.namespace}>
              <Text style={styles.namespaceTitle}>{namespace}</Text>
              {claims.map((claim) => (
                <View key={claim.elementIdentifier} style={styles.claimRow}>
                  <Text style={styles.claimKey}>{claim.elementIdentifier}</Text>
                  <Text style={styles.claimValue}>{claim.elementValue}</Text>
                </View>
              ))}
            </View>
          ))}
          <Pressable
            style={styles.button}
            onPress={() => {
              saveCredential(phase.credential);
              router.back();
            }}
          >
            <Text style={styles.buttonText}>Save to wallet</Text>
          </Pressable>
        </View>
      )}

      {phase.kind === "error" && (
        <View style={[styles.panel, styles.errorPanel]}>
          <Text style={styles.errorTitle}>Issuance failed</Text>
          <Text style={styles.errorMessage}>{phase.message}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <ActivityIndicator size="small" color="#208AEF" />;
  const icon = { pending: "○", done: "✓", error: "✗" }[status];
  const color = { pending: "#C4C9CF", done: "#1F9D55", error: "#D64545" }[status];
  return <Text style={{ color, fontSize: 15, width: 20 }}>{icon}</Text>;
}

function groupByNamespace(credential: ReceivedCredential) {
  const groups = new Map<string, ReceivedCredential["decoded"]["claims"]>();
  for (const claim of credential.decoded.claims) {
    groups.set(claim.namespace, [...(groups.get(claim.namespace) ?? []), claim]);
  }
  return [...groups.entries()];
}

function describeError(error: unknown): string {
  // Surface the issuer's raw OAuth/credential error response — that's the educational part
  if (error instanceof Oauth2ClientErrorResponseError) {
    return `${error.message}\n\n${JSON.stringify(error.errorResponse, null, 2)}`;
  }
  if (error instanceof Openid4vciRetrieveCredentialsError) {
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, gap: 8 },
  heading: { fontSize: 15, fontWeight: "600", color: "#1A1D21", flexShrink: 1 },
  stepRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    padding: 12,
    gap: 8,
  },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepName: { fontSize: 14, color: "#1A1D21", flex: 1 },
  chevron: { color: "#9AA1A9", fontSize: 13 },
  detail: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: "#5B6470",
    backgroundColor: "#F5F6F8",
    borderRadius: 8,
    padding: 8,
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    padding: 12,
    gap: 10,
    marginTop: 8,
  },
  option: { flexDirection: "row", alignItems: "center", gap: 8 },
  radio: { color: "#208AEF", fontSize: 16 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 14, color: "#1A1D21", fontWeight: "500" },
  optionSubtitle: { fontSize: 12, color: "#9AA1A9" },
  label: { fontSize: 13, fontWeight: "600", color: "#5B6470" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    padding: 12,
    fontSize: 15,
    color: "#1A1D21",
  },
  button: { backgroundColor: "#208AEF", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    fontSize: 11,
    color: "#208AEF",
    backgroundColor: "#E6F4FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  namespace: { gap: 4 },
  namespaceTitle: { fontSize: 12, fontWeight: "600", color: "#9AA1A9" },
  claimRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  claimKey: { fontSize: 13, color: "#5B6470" },
  claimValue: { fontSize: 13, color: "#1A1D21", flexShrink: 1, textAlign: "right" },
  errorPanel: { borderColor: "#F0B4B4", backgroundColor: "#FDF3F3" },
  errorTitle: { fontSize: 15, fontWeight: "600", color: "#D64545" },
  errorMessage: { fontFamily: "Menlo", fontSize: 12, color: "#8C3A3A" },
});
