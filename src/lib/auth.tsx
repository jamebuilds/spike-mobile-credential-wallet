import { createContext, use, useState, type ReactNode } from "react";
import * as nucleus from "./nucleus";
import type { NucleusUser } from "./nucleus";

interface Session {
  token: string;
  user: NucleusUser;
}

interface AuthContextValue {
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * In-memory session: lost on reload (spike — move the token to
 * expo-secure-store once login works end to end).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const signIn = async (email: string, password: string) => {
    setSession(await nucleus.login(email, password));
  };

  const signOut = async () => {
    const token = session?.token;
    setSession(null);
    // Best effort: the local session is already gone even if revoking fails
    if (token) await nucleus.logout(token).catch(() => {});
  };

  return <AuthContext value={{ session, signIn, signOut }}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
