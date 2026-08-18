const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  idToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || body.message || res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();
  if (json && typeof json === "object" && "success" in json && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

export const api = {
  // Auth
  verify: (idToken: string) =>
    request<import("./types").User>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),

  acceptInvitation: (idToken: string, invitationToken: string) =>
    request<{
      success: boolean;
      message: string;
      user: import("./types").User;
      deviceId: string;
    }>("/api/auth/accept-invitation", {
      method: "POST",
      body: JSON.stringify({ idToken, invitationToken }),
    }),

  getMe: (idToken: string) =>
    request<import("./types").User>("/api/auth/me", {}, idToken),

  // Users
  getUserProfile: (idToken: string) =>
    request<import("./types").User>("/api/users/me", {}, idToken),

  updateProfile: (
    idToken: string,
    data: { name?: string; avatarUrl?: string },
  ) =>
    request<import("./types").User>(
      "/api/users/me",
      { method: "PATCH", body: JSON.stringify(data) },
      idToken,
    ),

  // Devices
  getMyDevices: (idToken: string) =>
    request<import("./types").DeviceWithState[]>("/api/devices", {}, idToken),

  getDeviceCaretakers: (idToken: string, deviceId: string) =>
    request<import("./types").DeviceCaretaker[]>(
      `/api/caretakers/device/${deviceId}`,
      {},
      idToken,
    ),

  linkCaretaker: (
    idToken: string,
    data: { deviceId: string; email: string; role?: string },
  ) =>
    request<import("./types").DeviceCaretaker>(
      "/api/caretakers/link",
      { method: "POST", body: JSON.stringify(data) },
      idToken,
    ),

  updateCaretakerRole: (
    idToken: string,
    deviceId: string,
    caretakerId: string,
    role: string,
  ) =>
    request<import("./types").DeviceCaretaker>(
      `/api/caretakers/device/${deviceId}/caretaker/${caretakerId}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
      idToken,
    ),

  removeCaretaker: (
    idToken: string,
    deviceId: string,
    caretakerId: string,
  ) =>
    request<void>(
      `/api/caretakers/device/${deviceId}/caretaker/${caretakerId}`,
      { method: "DELETE" },
      idToken,
    ),

  // Commands
  createCommand: (
    idToken: string,
    data: {
      deviceId: string;
      title: string;
      command: string;
      description?: string;
      payload?: unknown;
      scheduledAt?: string;
    },
  ) =>
    request<import("./types").Task>(
      "/api/commands",
      { method: "POST", body: JSON.stringify(data) },
      idToken,
    ),

  getCommand: (idToken: string, id: string) =>
    request<import("./types").Task>(`/api/commands/${id}`, {}, idToken),

  getDeviceCommands: (idToken: string, deviceId: string, status?: string) => {
    const query = status ? `?status=${status}` : "";
    return request<import("./types").Task[]>(
      `/api/commands/device/${deviceId}${query}`,
      {},
      idToken,
    );
  },

  // Shared State
  getDeviceLatestState: (idToken: string, deviceId: string) =>
    request<import("./types").DeviceStateSnapshot>(
      `/api/shared-state/device/${deviceId}/latest`,
      {},
      idToken,
    ),

  getDeviceStateHistory: (
    idToken: string,
    deviceId: string,
    limit?: number,
  ) => {
    const query = limit ? `?limit=${limit}` : "";
    return request<import("./types").DeviceStateSnapshot[]>(
      `/api/shared-state/device/${deviceId}/history${query}`,
      {},
      idToken,
    );
  },

  // Help Requests
  getDeviceHelpRequests: (idToken: string, deviceId: string) =>
    request<import("./types").HelpRequest[]>(
      `/api/help-requests/device/${deviceId}`,
      {},
      idToken,
    ),

  resolveHelpRequest: (
    idToken: string,
    id: string,
    status: string,
  ) =>
    request<import("./types").HelpRequest>(
      `/api/help-requests/${id}/resolve`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      idToken,
    ),

  // Audit Logs
  getDeviceAuditLogs: (idToken: string, deviceId: string) =>
    request<import("./types").AuditLog[]>(
      `/api/audit-logs/device/${deviceId}`,
      {},
      idToken,
    ),

  getUserAuditLogs: (idToken: string, userId: string) =>
    request<import("./types").AuditLog[]>(
      `/api/audit-logs/user/${userId}`,
      {},
      idToken,
    ),

  // Invitations
  getInvitation: (token: string) =>
    request<import("./types").Invitation>(`/api/invitations/${token}`),

  createInvitation: (
    idToken: string,
    data: { deviceId: string; email: string; deviceName?: string },
  ) =>
    request<{ token: string }>(
      "/api/invitations",
      { method: "POST", body: JSON.stringify(data) },
      idToken,
    ),
};

export { ApiError };
