import "server-only";

import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";

const GOOGLE_STATE_COOKIE = "citycase_google_oauth_state";
const OAUTH_COOKIE_MAX_AGE = 60 * 10;

export async function appOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function createGoogleState() {
  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();

  cookieStore.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE
  });

  return state;
}

export async function verifyGoogleState(state: string | null) {
  const cookieStore = await cookies();
  const expected = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_STATE_COOKIE);

  return Boolean(state && expected && state === expected);
}

export function authErrorRedirect(origin: string, message: string) {
  const url = new URL("/", origin);
  url.searchParams.set("auth_error", message);
  return url;
}
