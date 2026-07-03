import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accesso richiesto" }, { status: 401 });
  }
  const userId = user.id;
  const body = await request.json();
  const nodeId = String(body.nodeId ?? "");
  const noteBody = String(body.body ?? "");

  if (!nodeId) {
    return NextResponse.json({ error: "nodeId richiesto" }, { status: 400 });
  }

  const note = await prisma.userNote.upsert({
    where: { userId_nodeId: { userId, nodeId } },
    create: { userId, nodeId, body: noteBody },
    update: { body: noteBody }
  });

  return NextResponse.json({ note });
}
