import { NextResponse } from "next/server";
import { createSession, hashPassword, isValidEmail, normalizeEmail, normalizeNickname } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function uniqueNicknameFromEmail(email: string) {
  const base = normalizeNickname(email.split("@")[0] || "analista") || "analista";

  for (let index = 0; index < 50; index += 1) {
    const nickname = index === 0 ? base : `${base}${index + 1}`;
    const existing = await prisma.user.findUnique({ where: { nickname } });
    if (!existing) return nickname;
  }

  return `analista-${Date.now().toString(36)}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = normalizeEmail(String(body.email ?? body.identifier ?? ""));
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim().slice(0, 40) || null;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Inserisci un indirizzo e-mail valido." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "La password deve avere almeno 8 caratteri." }, { status: 400 });
  }

  try {
    const nickname = await uniqueNicknameFromEmail(email);
    const user = await prisma.user.create({
      data: { email, displayName, nickname, passwordHash: hashPassword(password) }
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, nickname: user.nickname, displayName: user.displayName } });
  } catch (error) {
    console.error("CityCase registration failed", error);
    return NextResponse.json({ error: "Questa e-mail è già registrata. Usa Accedi." }, { status: 409 });
  }
}
