// Mirrors the Phase 0 backend contract. All fields are camelCase; `deviceId` in
// records is always the string device id (not the UUID).

export type Role = "primary" | "caretaker" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  phoneE164: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceSummary {
  id: string;
  deviceId: string;
  displayName: string | null;
  isVerified: boolean;
  status: string;
  lastActiveAt: string | null;
  batteryLevel: number | null;
  batteryStatus: string | null;
  wifiSsid: string | null;
  role: Role;
  deviceMetadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Caretaker {
  caretakerId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  phoneE164: string | null;
  role: Role;
  status: string;
  linkedAt: string;
  isMe: boolean;
}

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked"
  | "locked";

export interface InvitationPreview {
  email: string;
  deviceName: string;
  role: Role;
  status: InvitationStatus;
  expiresAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface CreatedInvitation {
  invitationId: string;
  email: string;
  role: Role;
  pairingCode: string;
  expiresAt: string;
}

export interface AcceptInvitationResult {
  deviceId: string;
  role: Role;
}

export type Command =
  | { type: "ring_device" }
  | { type: "sync_now" }
  | { type: "report_location" }
  | { type: "show_message"; text: string; voiceClipId?: string }
  | { type: "set_volume"; level: number }
  | { type: "update_emergency_number"; e164: string };

export type CommandType = Command["type"];

export type CommandStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export interface CommandResult {
  success: boolean;
  message: string;
  [key: string]: unknown;
}

export interface CommandRecord {
  id: string;
  deviceId: string;
  type: CommandType;
  payload: Record<string, unknown>;
  status: CommandStatus;
  result: CommandResult | null;
  createdBy: string | null;
  createdAt: string;
  deliveredAt: string | null;
  completedAt: string | null;
  expiresAt: string;
}

export interface Snapshot {
  id: string;
  deviceId: string;
  batteryLevel: number | null;
  batteryStatus: string | null;
  wifiSsid: string | null;
  storageFreeMb: number | null;
  installedApps: unknown;
  settings: Record<string, unknown> | null;
  snapshotData: Record<string, unknown> | null;
  createdAt: string;
}

export type HelpRequestType = "general" | "sos" | "medical" | "tech_support";
export type HelpRequestStatus =
  | "pending"
  | "in_progress"
  | "resolved"
  | "cancelled";

export interface HelpRequest {
  id: string;
  deviceId: string;
  title: string;
  description: string | null;
  type: HelpRequestType;
  status: HelpRequestStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  deviceId: string | null;
  userId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export function canSendCommands(role: Role | undefined) {
  return role === "primary" || role === "caretaker";
}
