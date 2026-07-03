import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accesso richiesto" }, { status: 401 });
  }

  const body = await request.json();
  const caseId = String(body.caseId ?? "");
  const nodeId = String(body.nodeId ?? "");

  if (!caseId || !nodeId) {
    return NextResponse.json({ error: "caseId e nodeId richiesti" }, { status: 400 });
  }

  const totalNodes = await prisma.node.count({ where: { caseId } });
  const current = await prisma.userProgress.findUnique({
    where: { userId_caseId: { userId: user.id, caseId } }
  });
  const discovered = Array.isArray(current?.discoveredNodes) ? current.discoveredNodes.map(String) : [];
  const nextDiscovered = Array.from(new Set([...discovered, nodeId]));
  const progressPercent = Math.min(100, Math.max(current?.progressPercent ?? 0, Math.round((nextDiscovered.length / Math.max(totalNodes, 1)) * 70)));

  const progress = await prisma.userProgress.upsert({
    where: { userId_caseId: { userId: user.id, caseId } },
    create: {
      userId: user.id,
      caseId,
      status: "in_progress",
      discoveredNodes: nextDiscovered,
      progressPercent
    },
    update: {
      discoveredNodes: nextDiscovered,
      progressPercent
    }
  });

  return NextResponse.json({ progress });
}
