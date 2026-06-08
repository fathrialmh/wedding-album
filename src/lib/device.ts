const DEVICE_KEY = "wedding_device_id";
const GUEST_NAME_KEY = "wedding_guest_name";

export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let deviceId = localStorage.getItem(DEVICE_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  return deviceId;
}

export function getGuestName(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(GUEST_NAME_KEY);
}

export function setGuestName(name: string): void {
  localStorage.setItem(GUEST_NAME_KEY, name.trim());
}

export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_NAME_KEY);
}
