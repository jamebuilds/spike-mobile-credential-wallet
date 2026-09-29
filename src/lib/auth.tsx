import { createContext, use, useEffect, useState, type ReactNode } from "react";
import * as nucleus from "./nucleus";
import { NucleusError, type NucleusUser } from "./nucleus";
import { clearToken, getToken, saveToken } from "./token-store";

interface Session {
  token: string;
  // Absent when restored offline — the profile screen fetches it on retry
  user?: NucleusUser;
}

type AuthStatus = "restoring" | "signedIn" | "signedOut";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The token lives in SecureStore; the user is always re-fetched from /me so
 * Nucleus stays the source of truth for whether the session is still valid.
 */
async function restoreSession(): Promise<Session | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    return { token, user: await nucleus.me(token) };
  } catch (e) {
    if (e instanceof NucleusError && e.status === 401) {
      await clearToken();
      return null;
    }
    // Offline or server error: stay signed in rather than log the user out
    return { token };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    restoreSession()
      .catch(() => null) // unreadable keychain → treat as signed out
      .then((restored) => {
        setSession(restored);
        setStatus(restored ? "signedIn" : "signedOut");
      });
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await nucleus.login(email, password);
    await saveToken(result.token);
    setSession(result);
    setStatus("signedIn");
  };

  const signOut = async () => {
    const token = session?.token;
    // Local sign-out first so the device is logged out even if revoking fails
    await clearToken().catch(() => {});
    setSession(null);
    setStatus("signedOut");
    if (token) await nucleus.logout(token).catch(() => {});
  };

  return <AuthContext value={{ status, session, signIn, signOut }}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
