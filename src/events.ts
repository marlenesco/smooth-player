export class TypedEventEmitter<TEvents extends object> {
  private listeners = new Map<keyof TEvents, Set<(payload: unknown) => void>>();

  on<TKey extends keyof TEvents>(event: TKey, listener: (payload: TEvents[TKey]) => void): () => void {
    const eventListeners = this.listeners.get(event) ?? new Set();
    eventListeners.add(listener as (payload: unknown) => void);
    this.listeners.set(event, eventListeners);

    return () => this.off(event, listener);
  }

  off<TKey extends keyof TEvents>(event: TKey, listener: (payload: TEvents[TKey]) => void): void {
    this.listeners.get(event)?.delete(listener as (payload: unknown) => void);
  }

  emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
