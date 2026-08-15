import { useSyncExternalStore } from "react";
import type { ReceivedCredential } from "./oid4vci";

/**
 * In-memory credential store: lives only for this app session (spike
 * simplification — nothing is persisted).
 */
let credentials: ReceivedCredential[] = [];
const listeners = new Set<() => void>();

export function saveCredential(credential: ReceivedCredential) {
  credentials = [credential, ...credentials];
  listeners.forEach((listener) => listener());
}

export function useCredentials(): ReceivedCredential[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => credentials,
  );
}
