import { NextResponse } from "next/server";
import { createSession, normalizeNickname, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const nickname = normalizeNickname(String(body.nickname ?? ""));
  const password = String(body.password ?? "");

  if (!nickname || !password) {
    return NextResponse.json({ error: "Nickname e password richiesti" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, user: { id: user.id, nickname: user.nickname } });
}
