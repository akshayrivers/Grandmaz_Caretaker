const SESSION_KEY = "local-flow-caretaker";

/** Fixed bearer accepted by the backend only when LOCAL_FLOW=1 and not production. */
export const LOCAL_CARETAKER_TOKEN = "local-caretaker";

export function localSessionActive(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function markLocalSession(): void {
  sessionStorage.setItem(SESSION_KEY, "1");
}

export function clearLocalSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
