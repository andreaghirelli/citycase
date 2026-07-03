import { NextResponse } from "next/server";
import { createSession, normalizeEmail, normalizeNickname, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const identifier = String(body.email ?? body.identifier ?? body.nickname ?? "");
  const email = normalizeEmail(identifier);
  const nickname = normalizeNickname(identifier);
  const password = String(body.password ?? "");

  if (!identifier.trim() || !password) {
    return NextResponse.json({ error: "E-mail e password richieste." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { nickname }]
    }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "E-mail o password non corretti." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, nickname: user.nickname, displayName: user.displayName } });
}
