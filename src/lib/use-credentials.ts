import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth";
import { listCredentials, NucleusError, type NucleusCredential } from "./nucleus";

type Status = "loading" | "refreshing" | "loadingMore" | "idle";

/**
 * Paginated credential list for the signed-in user. A 401 signs out, the
 * same as any other authenticated request.
 */
export function useCredentials() {
  const { session, signOut } = useAuth();
  const token = session?.token;
  const [credentials, setCredentials] = useState<NucleusCredential[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState<number>();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>();
  // onEndReached fires repeatedly while scrolling; one request at a time
  const inFlight = useRef(false);

  const fetchPage = (nextPage: number) => {
    if (!token) return;
    inFlight.current = true;
    listCredentials(token, nextPage)
      .then((result) => {
        setCredentials((current) =>
          nextPage === 1 ? result.data : [...current, ...result.data],
        );
        setPage(result.meta.current_page);
        setLastPage(result.meta.last_page);
        setTotal(result.meta.total);
        setError(undefined);
      })
      .catch((e) => {
        if (e instanceof NucleusError && e.status === 401) signOut();
        else setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        inFlight.current = false;
        setStatus("idle");
      });
  };

  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const refresh = () => {
    if (inFlight.current) return;
    setStatus("refreshing");
    fetchPage(1);
  };

  const loadMore = () => {
    // A failed page waits for an explicit retry instead of re-firing on scroll
    if (inFlight.current || error || page >= lastPage) return;
    setStatus("loadingMore");
    fetchPage(page + 1);
  };

  const retry = () => {
    if (inFlight.current) return;
    setError(undefined);
    const nextPage = page === 0 ? 1 : page + 1;
    setStatus(nextPage === 1 ? "loading" : "loadingMore");
    fetchPage(nextPage);
  };

  return { credentials, total, status, error, refresh, loadMore, retry };
}
