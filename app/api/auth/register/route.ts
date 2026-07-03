import { NextResponse } from "next/server";
import { createSession, hashPassword, normalizeNickname } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const nickname = normalizeNickname(String(body.nickname ?? ""));
  const password = String(body.password ?? "");

  if (nickname.length < 3) {
    return NextResponse.json({ error: "Il nickname deve avere almeno 3 caratteri" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La password deve avere almeno 6 caratteri" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: { nickname, passwordHash: hashPassword(password) }
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, nickname: user.nickname } });
  } catch {
    return NextResponse.json({ error: "Nickname già registrato" }, { status: 409 });
  }
}
