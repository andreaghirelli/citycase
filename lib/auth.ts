import "server-only";

import { cookies } from "next/headers";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "citycase_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "citycase-local-secret";
}

function sign(value: string) {
  return createHash("sha256").update(`${value}.${secret()}`).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = pbkdf2Sync(password, salt, 120000, 32, "sha256");
  const original = Buffer.from(hash, "hex");
  return original.length === candidate.length && timingSafeEqual(original, candidate);
}

export function normalizeNickname(nickname: string) {
  return nickname.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function displayNameForUser(user: { displayName?: string | null; email?: string | null; nickname: string }) {
  return user.displayName || user.email?.split("@")[0] || user.nickname;
}

export async function uniqueNicknameFromEmail(email: string) {
  const base = normalizeNickname(email.split("@")[0] || "analista") || "analista";

  for (let index = 0; index < 50; index += 1) {
    const nickname = index === 0 ? base : `${base}${index + 1}`;
    const existing = await prisma.user.findUnique({ where: { nickname } });
    if (!existing) return nickname;
  }

  return `analista-${Date.now().toString(36)}`;
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const value = `${userId}.${sign(userId)}`;
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const [userId, signature] = raw?.split(".") ?? [];

  if (!userId || !signature || signature !== sign(userId)) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, email: true, displayName: true, createdAt: true }
  });
}
