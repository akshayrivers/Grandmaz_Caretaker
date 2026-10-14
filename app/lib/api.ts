import { getFirebaseAuth } from "./firebase";
import type {
  AcceptInvitationResult,
  AuditLog,
  Caretaker,
  Command,
  CommandRecord,
  CommandStatus,
  CreatedInvitation,
  DeviceSummary,
  HelpRequest,
  HelpRequestStatus,
  Invitation,
  InvitationPreview,
  Role,
  Snapshot,
  User,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  code: string | undefined;
  details: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Send the signed-in user's Firebase ID token. Defaults to true. */
  auth?: boolean;
}

async function currentIdToken(forceRefresh: boolean): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new ApiError("You are not signed in.", 401, "NOT_SIGNED_IN");
  }
  return user.getIdToken(forceRefresh);
}

async function send(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    return await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Check your connection and try again.",
      0,
      "NETWORK_ERROR",
    );
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as {
    message?: string;
    error?: string;
    code?: string;
    details?: unknown;
  } | null;
  return new ApiError(
    body?.message || body?.error || res.statusText || "Request failed",
    res.status,
    body?.code,
    body?.details,
  );
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth ?? true;

  let res = await send(path, options, useAuth ? await currentIdToken(false) : null);
  if (res.status === 401 && useAuth) {
    res = await send(path, options, await currentIdToken(true));
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as { success?: boolean; data?: T };
  return json.data as T;
}

const enc = encodeURIComponent;

/** Human-readable message for any thrown value; branches on `code`, never on `message`. */
export function describeError(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "FORBIDDEN":
        return "You don't have permission to do this for this device.";
      case "NOT_SIGNED_IN":
        return "You are signed out. Please sign in again.";
      case "INVALID_PHONE":
        return "That phone number isn't valid. Use international format, e.g. +919876543210.";
      case "PRIMARY_CANNOT_LEAVE":
        return "The primary caretaker can't be removed. Transfer the primary role first.";
      case "PRIMARY_CANNOT_DEMOTE_SELF":
        return "Transfer the primary role to someone else before changing your own role.";
      case "ALREADY_PRIMARY":
        return "That person is already the primary caretaker.";
      case "ALREADY_LINKED":
        return "This person is already a caretaker of this device.";
      case "DEVICE_NOT_FOUND":
        return "This device could not be found.";
      case "INVITATION_NOT_FOUND":
        return "This invitation link is not valid.";
      case "INVITATION_USED":
        return "This invitation was already used.";
      case "INVITATION_REVOKED":
        return "This invitation was cancelled.";
      case "INVITATION_EXPIRED":
        return "This invitation has expired. Ask for a new one.";
      case "INVITATION_LOCKED":
        return "Too many wrong codes. Ask for a new invitation.";
      case "INVITATION_NOT_PENDING":
        return "Only a pending invitation can be cancelled.";
      case "INVALID_PAIRING_CODE":
        return "That pairing code is not correct.";
      case "EMAIL_MISMATCH":
        return "Sign in with the email address this invitation was sent to.";
      case "EMAIL_NOT_VERIFIED":
        return "Verify your email address before accepting this invitation.";
      case "CARETAKER_NOT_FOUND":
        return "That caretaker is not linked to this device.";
    }
    if (err.status === 401) return "Your session has expired. Please sign in again.";
    if (err.status === 403) return "You don't have access to this.";
    if (err.status === 429) return "Too many attempts. Please wait a minute and try again.";
    if (err.status >= 500) return "The server had a problem. Please try again shortly.";
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const api = {
  // Auth / profile
  verify: () => request<User>("/api/auth/verify", { method: "POST" }),

  getMe: () => request<User>("/api/auth/me"),

  getProfile: () => request<User>("/api/users/me"),

  updateProfile: (data: { name?: string; phoneE164?: string | null }) =>
    request<User>("/api/users/me", { method: "PATCH", body: data }),

  // Invitations
  previewInvitation: (token: string) =>
    request<InvitationPreview>("/api/invitations/preview", {
      method: "POST",
      body: { token },
      auth: false,
    }),

  acceptInvitation: (invitationToken: string, pairingCode: string) =>
    request<AcceptInvitationResult>("/api/auth/accept-invitation", {
      method: "POST",
      body: { invitationToken, pairingCode },
    }),

  createInvitation: (
    deviceId: string,
    data: { email: string; role: Exclude<Role, "primary"> },
  ) =>
    request<CreatedInvitation>(`/api/invitations/device/${enc(deviceId)}`, {
      method: "POST",
      body: data,
    }),

  getDeviceInvitations: (deviceId: string) =>
    request<Invitation[]>(`/api/invitations/device/${enc(deviceId)}`),

  revokeInvitation: (invitationId: string) =>
    request<void>(`/api/invitations/${enc(invitationId)}`, { method: "DELETE" }),

  // Devices
  getMyDevices: () => request<DeviceSummary[]>("/api/devices"),

  getDevice: (deviceId: string) =>
    request<DeviceSummary>(`/api/devices/${enc(deviceId)}`),

  renameDevice: (deviceId: string, displayName: string) =>
    request<DeviceSummary>(`/api/devices/${enc(deviceId)}`, {
      method: "PATCH",
      body: { displayName },
    }),

  // Caretakers
  getDeviceCaretakers: (deviceId: string) =>
    request<Caretaker[]>(`/api/caretakers/device/${enc(deviceId)}`),

  updateCaretakerRole: (
    deviceId: string,
    caretakerId: string,
    role: Exclude<Role, "primary">,
  ) =>
    request<Caretaker>(
      `/api/caretakers/device/${enc(deviceId)}/caretaker/${enc(caretakerId)}`,
      { method: "PATCH", body: { role } },
    ),

  transferPrimary: (deviceId: string, caretakerId: string) =>
    request<Caretaker[]>(
      `/api/caretakers/device/${enc(deviceId)}/transfer-primary`,
      { method: "POST", body: { caretakerId } },
    ),

  removeCaretaker: (deviceId: string, caretakerId: string) =>
    request<void>(
      `/api/caretakers/device/${enc(deviceId)}/caretaker/${enc(caretakerId)}`,
      { method: "DELETE" },
    ),

  // Commands
  createCommand: (deviceId: string, command: Command, expiresInMinutes?: number) =>
    request<CommandRecord>("/api/commands", {
      method: "POST",
      body: { deviceId, command, expiresInMinutes },
    }),

  getCommand: (id: string) => request<CommandRecord>(`/api/commands/${enc(id)}`),

  getDeviceCommands: (deviceId: string, status?: CommandStatus) =>
    request<CommandRecord[]>(
      `/api/commands/device/${enc(deviceId)}${status ? `?status=${status}` : ""}`,
    ),

  // Shared state
  getDeviceLatestState: (deviceId: string) =>
    request<Snapshot | null>(`/api/shared-state/device/${enc(deviceId)}/latest`),

  getDeviceStateHistory: (deviceId: string, limit?: number) =>
    request<Snapshot[]>(
      `/api/shared-state/device/${enc(deviceId)}/history${limit ? `?limit=${limit}` : ""}`,
    ),

  // Help requests
  getDeviceHelpRequests: (deviceId: string) =>
    request<HelpRequest[]>(`/api/help-requests/device/${enc(deviceId)}`),

  resolveHelpRequest: (id: string, status: HelpRequestStatus) =>
    request<HelpRequest>(`/api/help-requests/${enc(id)}/resolve`, {
      method: "PATCH",
      body: { status },
    }),

  // Audit logs
  getDeviceAuditLogs: (deviceId: string) =>
    request<AuditLog[]>(`/api/audit-logs/device/${enc(deviceId)}`),
};
