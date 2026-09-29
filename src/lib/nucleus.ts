import Constants from "expo-constants";
import * as Device from "expo-device";

export interface NucleusUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResult {
  token: string;
  user: NucleusUser;
}

/**
 * Nucleus runs on port 8081 of the dev machine. In development, hostUri is the
 * Metro host ("192.168.1.5:8082"), so the same machine serves Nucleus — this works
 * on the simulator (localhost) and on a phone on the same Wi-Fi (LAN IP).
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_NUCLEUS_URL) return process.env.EXPO_PUBLIC_NUCLEUS_URL;
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:8081`;
}

export const API_URL = resolveApiUrl();

export class NucleusError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new NucleusError(`Can't reach Nucleus at ${API_URL}`);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // Laravel validation errors: { message, errors: { field: [msg] } }
    const firstFieldError = body?.errors ? Object.values<string[]>(body.errors)[0]?.[0] : undefined;
    throw new NucleusError(
      firstFieldError ?? body?.message ?? `Request failed (${response.status})`,
      response.status,
    );
  }
  return body as T;
}

export function login(email: string, password: string): Promise<LoginResult> {
  return request<LoginResult>("/api/mobile/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      device_name: Device.modelName ?? "Accredify Wallet",
    }),
  });
}

export function me(token: string): Promise<NucleusUser> {
  // Laravel JsonResource wraps in { data } unless wrapping is disabled
  return request<NucleusUser | { data: NucleusUser }>("/api/mobile/me", { token }).then((body) =>
    "data" in body ? body.data : body,
  );
}

export function logout(token: string): Promise<void> {
  return request<void>("/api/mobile/logout", { method: "POST", token });
}
