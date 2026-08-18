export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  device_id: string;
  public_key: string;
  device_metadata: Record<string, unknown> | null;
  is_verified: boolean;
  status: string;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceCaretaker {
  id: string;
  caretaker_id: string;
  device_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  caretaker?: User;
}

export interface Task {
  id: string;
  device_id: string;
  created_by: string;
  title: string;
  command: string;
  description: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  result: Record<string, unknown> | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelpRequest {
  id: string;
  device_id: string;
  title: string;
  description: string | null;
  type: "general" | "sos" | "medical" | "tech_support";
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  device_id: string | null;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface DeviceStateSnapshot {
  id: string;
  device_id: string;
  battery_level: number | null;
  battery_status: string | null;
  wifi_ssid: string | null;
  storage_free_mb: number | null;
  installed_apps: unknown;
  settings: Record<string, unknown> | null;
  snapshot_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Invitation {
  valid: boolean;
  email: string;
  deviceId: string;
  expiresAt: string;
  accepted?: boolean;
}

export interface DeviceWithState {
  id: string;
  deviceId: string;
  deviceUuid?: string;
  displayName: string;
  publicKey?: string;
  deviceMetadata?: Record<string, unknown> | null;
  isVerified: boolean;
  status: string;
  lastActiveAt: string | null;
  batteryLevel: number | null;
  batteryStatus: string | null;
  wifiSsid: string | null;
  caretakerRole: string;
  createdAt?: string;
  updatedAt?: string;
}
