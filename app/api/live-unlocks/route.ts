import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { distanceInMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accesso richiesto" }, { status: 401 });
  }
  const userId = user.id;
  const body = await request.json();
  const caseId = String(body.caseId ?? "");
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!caseId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Coordinate non valide" }, { status: 400 });
  }

  const unlocks = await prisma.liveUnlock.findMany({
    where: { caseId },
    include: { node: true }
  });

  const unlocked = unlocks
    .filter((unlock) => unlock.node.latitude !== null && unlock.node.longitude !== null)
    .map((unlock) => ({
      unlock,
      distance: distanceInMeters(
        { latitude, longitude },
        { latitude: unlock.node.latitude ?? 0, longitude: unlock.node.longitude ?? 0 }
      )
    }))
    .filter((item) => item.distance <= item.unlock.unlockRadiusM);

  const progress = await prisma.userProgress.upsert({
    where: { userId_caseId: { userId, caseId } },
    create: {
      userId,
      caseId,
      status: "in_progress",
      progressPercent: unlocked.length > 0 ? 40 : 25,
      unlockedLive: unlocked.map((item) => item.unlock.id)
    },
    update: {
      unlockedLive: unlocked.map((item) => item.unlock.id),
      progressPercent: unlocked.length > 0 ? 40 : undefined
    }
  });

  return NextResponse.json({
    progress,
    unlocked: unlocked.map((item) => ({
      id: item.unlock.id,
      nodeId: item.unlock.nodeId,
      title: item.unlock.title,
      description: item.unlock.description,
      unlockedContent: item.unlock.unlockedContent,
      distance: Math.round(item.distance)
    }))
  });
}
