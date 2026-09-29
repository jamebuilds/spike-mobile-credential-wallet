import { useEffect, useState } from "react";
import { useAuth } from "./auth";

/**
 * The signed-in user. Login and restore already fetch it; only a session
 * restored offline arrives without one, so this loads it on demand.
 */
export function useCurrentUser() {
  const { session, reloadUser } = useAuth();
  const [error, setError] = useState<string>();

  const load = () =>
    reloadUser()
      .then(() => setError(undefined))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));

  useEffect(() => {
    if (!session?.user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user: session?.user, error, retry: load };
}
