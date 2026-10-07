"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_SNAPSHOT,
  ResourceCache,
  type ResourceLoader,
} from "@/lib/client/resource-cache";
import type { AuthenticatedUser } from "@/types/auth";
import { FullScreenTransition } from "@/components/ui/full-screen-transition";

export const CacheContext = createContext<ResourceCache | null>(null);
const UserContext = createContext<AuthenticatedUser | null>(null);

export function DashboardProvider({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: ReactNode;
}) {
  const [cache] = useState(() => new ResourceCache());
  const [sessionEnded, setSessionEnded] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const invalidate = () => cache.invalidate();
    const focus = () => {
      if (document.visibilityState === "visible") cache.revalidateActive();
    };
    const expired = () => {
      setSessionEnded(true);
      cache.clear();
      router.replace("/login");
      router.refresh();
    };
    window.addEventListener("cellexa:data-changed", invalidate);
    window.addEventListener("cellexa:session-expired", expired);
    window.addEventListener("focus", focus);
    window.addEventListener("online", focus);
    return () => {
      window.removeEventListener("cellexa:data-changed", invalidate);
      window.removeEventListener("cellexa:session-expired", expired);
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", focus);
      cache.clear();
    };
  }, [cache, router]);
  return (
    <UserContext.Provider value={user}>
      <CacheContext.Provider value={cache}>
        {children}
        {sessionEnded && (
          <FullScreenTransition
            title="Session expired"
            description="Please wait while we return you to sign in."
          />
        )}
      </CacheContext.Provider>
    </UserContext.Provider>
  );
}

export function useDashboardUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("DashboardProvider is required.");
  return user;
}

export function useResource<T>(
  key: string,
  loader: ResourceLoader<T>,
  keepPreviousData = false,
) {
  const cache = useContext(CacheContext);
  if (!cache) throw new Error("DashboardProvider is required.");
  const subscribe = useCallback(
    (listener: () => void) => cache.subscribe(key, listener),
    [cache, key],
  );
  const getSnapshot = useCallback(() => cache.get<T>(key), [cache, key]);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_SNAPSHOT,
  );
  const [previousData, setPreviousData] = useState<T | undefined>(undefined);
  if (snapshot.data !== undefined && previousData !== snapshot.data)
    setPreviousData(snapshot.data);
  useEffect(() => {
    void cache.fetch(key, loader);
  }, [cache, key, loader]);
  const refresh = useCallback(
    () => cache.fetch(key, loader, true),
    [cache, key, loader],
  );
  const revalidate = useCallback(
    () => cache.fetch(key, loader),
    [cache, key, loader],
  );
  const status = (snapshot.error as { status?: number } | null)?.status;
  const canKeepPrevious =
    keepPreviousData && status !== 401 && status !== 403 && status !== 404;
  const data = snapshot.data ?? (canKeepPrevious ? previousData : undefined);
  return {
    data,
    error: snapshot.error,
    isLoading: data === undefined && !snapshot.error,
    isRefreshing: snapshot.pending || (!snapshot.updatedAt && !snapshot.error),
    refresh,
    revalidate,
  };
}
