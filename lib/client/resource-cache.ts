export type ResourceLoader<T> = (signal: AbortSignal) => Promise<T>;
export interface ResourceSnapshot<T> {
  data?: T;
  error: Error | null;
  pending: boolean;
  updatedAt: number;
}
interface Entry {
  snapshot: ResourceSnapshot<unknown>;
  listeners: Set<() => void>;
  loader?: ResourceLoader<unknown>;
  controller?: AbortController;
  promise?: Promise<void>;
}
export const EMPTY_SNAPSHOT: ResourceSnapshot<never> = {
  error: null,
  pending: false,
  updatedAt: 0,
};

export class ResourceCache {
  private entries = new Map<string, Entry>();

  private entry(key: string): Entry {
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 100) {
        for (const [oldKey, candidate] of this.entries) {
          if (!candidate.listeners.size && !candidate.promise) {
            this.entries.delete(oldKey);
            break;
          }
        }
      }
      entry = { snapshot: EMPTY_SNAPSHOT, listeners: new Set() };
      this.entries.set(key, entry);
    }
    return entry;
  }

  get<T>(key: string): ResourceSnapshot<T> {
    return this.entry(key).snapshot as ResourceSnapshot<T>;
  }

  subscribe(key: string, listener: () => void) {
    const entry = this.entry(key);
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
    };
  }

  private publish(entry: Entry, snapshot: ResourceSnapshot<unknown>) {
    entry.snapshot = snapshot;
    entry.listeners.forEach((listener) => listener());
  }

  async fetch<T>(
    key: string,
    loader: ResourceLoader<T>,
    force = false,
  ): Promise<void> {
    const entry = this.entry(key);
    entry.loader = loader;
    if (entry.promise && !force) return entry.promise;
    if (
      !force &&
      entry.snapshot.data !== undefined &&
      Date.now() - entry.snapshot.updatedAt < 30_000
    )
      return;
    entry.controller?.abort();
    const controller = new AbortController();
    entry.controller = controller;
    this.publish(entry, { ...entry.snapshot, error: null, pending: true });
    const promise = (async () => {
      try {
        const data = await Promise.resolve().then(() =>
          loader(controller.signal),
        );
        if (controller.signal.aborted) return;
        this.publish(entry, {
          data,
          error: null,
          pending: false,
          updatedAt: Date.now(),
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = (error as { status?: number })?.status;
        this.publish(entry, {
          ...entry.snapshot,
          data:
            status === 401 || status === 403 || status === 404
              ? undefined
              : entry.snapshot.data,
          error:
            error instanceof Error ? error : new Error("Unable to load data."),
          pending: false,
        });
      } finally {
        if (entry.controller === controller) entry.promise = undefined;
      }
    })();
    entry.promise = promise;
    return promise;
  }

  invalidate() {
    for (const [key, entry] of this.entries) {
      entry.controller?.abort();
      entry.promise = undefined;
      this.publish(entry, { ...entry.snapshot, updatedAt: 0, pending: false });
      if (entry.listeners.size && entry.loader)
        void this.fetch(key, entry.loader, true);
    }
  }

  revalidateActive() {
    for (const [key, entry] of this.entries) {
      if (entry.listeners.size && entry.loader)
        void this.fetch(key, entry.loader);
    }
  }

  clear() {
    for (const entry of this.entries.values()) {
      entry.controller?.abort();
      entry.promise = undefined;
      this.publish(entry, EMPTY_SNAPSHOT);
    }
  }
}
