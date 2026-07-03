import { NextResponse } from "next/server";
import { getDemoUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const userId = getDemoUserId();
  const body = await request.json();
  const caseId = String(body.caseId ?? "");
  const sourceId = String(body.sourceId ?? "");
  const targetId = String(body.targetId ?? "");
  const label = String(body.label ?? "collegato a");
  const description = body.description ? String(body.description) : null;

  if (!caseId || !sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ error: "Connessione non valida" }, { status: 400 });
  }

  const connection = await prisma.userConnection.create({
    data: { userId, caseId, sourceId, targetId, label, description },
    include: { source: true, target: true }
  });

  return NextResponse.json({
    connection: {
      id: connection.id,
      sourceId: connection.sourceId,
      targetId: connection.targetId,
      sourceTitle: connection.source.title,
      targetTitle: connection.target.title,
      label: connection.label,
      description: connection.description
    }
  });
}
