import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function getCases() {
  const user = await getCurrentUser();
  const userId = user?.id ?? "";

  const cases = await prisma.case.findMany({
    orderBy: [{ caseNumber: "asc" }],
    include: {
      city: true,
      nodes: true,
      documents: true,
      questions: true,
      userProgress: {
        where: { userId }
      }
    }
  });

  return cases.map((item) => ({
    id: item.id,
    caseNumber: item.caseNumber,
    title: item.title,
    subtitle: item.subtitle,
    year: item.year,
    summary: item.summary,
    coverNote: item.coverNote,
    city: item.city,
    counts: {
      nodes: item.nodes.length,
      documents: item.documents.length,
      questions: item.questions.length
    },
    questions: item.questions
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        id: question.id,
        text: question.text,
        context: question.context,
        order: question.order
      })),
    progressPercent: item.userProgress[0]?.progressPercent ?? 0
  }));
}

export async function getCaseWorkspace(caseId: string) {
  const user = await getCurrentUser();
  const userId = user?.id ?? "";

  const dossier = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      city: true,
      nodes: {
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: { documents: { orderBy: { title: "asc" } }, notes: { where: { userId } }, liveUnlocks: true }
      },
      connections: {
        include: { source: true, target: true },
        orderBy: { createdAt: "asc" }
      },
      questions: { orderBy: { order: "asc" } },
      mandates: { orderBy: { order: "asc" } },
      documents: { orderBy: { title: "asc" } },
      liveUnlocks: true,
      userProgress: { where: { userId } },
      userConnections: {
        where: { userId },
        include: { source: true, target: true },
        orderBy: { createdAt: "desc" }
      },
      userTheories: { where: { userId }, orderBy: { updatedAt: "desc" } }
    }
  });

  if (!dossier) {
    return null;
  }

  return {
    id: dossier.id,
    caseNumber: dossier.caseNumber,
    title: dossier.title,
    subtitle: dossier.subtitle,
    year: dossier.year,
    summary: dossier.summary,
    coverNote: dossier.coverNote,
    city: dossier.city,
    user,
    progressPercent: dossier.userProgress[0]?.progressPercent ?? 0,
    progress: {
      discoveredNodes: stringArray(dossier.userProgress[0]?.discoveredNodes),
      openedDocuments: stringArray(dossier.userProgress[0]?.openedDocuments),
      unlockedLive: stringArray(dossier.userProgress[0]?.unlockedLive)
    },
    nodes: dossier.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      subtitle: node.subtitle,
      description: node.description,
      dateLabel: node.dateLabel,
      latitude: node.latitude,
      longitude: node.longitude,
      address: node.address,
      reliability: node.reliability,
      discovered: node.discovered,
      order: node.order,
      metadata: node.metadata,
      note: node.notes[0]?.body ?? "",
      documents: node.documents.map((document) => ({
        id: document.id,
        title: document.title,
        kind: document.kind,
        excerpt: document.excerpt,
        content: document.content,
        sourceLabel: document.sourceLabel,
        dateLabel: document.dateLabel,
        reliability: document.reliability
      })),
      liveUnlocks: node.liveUnlocks.map((unlock) => ({
        id: unlock.id,
        title: unlock.title,
        description: unlock.description,
        unlockRadiusM: unlock.unlockRadiusM,
        unlockedContent: unlock.unlockedContent
      }))
    })),
    connections: dossier.connections.map((connection) => ({
      id: connection.id,
      sourceId: connection.sourceId,
      targetId: connection.targetId,
      sourceTitle: connection.source.title,
      targetTitle: connection.target.title,
      label: connection.label,
      description: connection.description,
      reliability: connection.reliability
    })),
    questions: dossier.questions.map((question) => ({
      id: question.id,
      text: question.text,
      context: question.context,
      order: question.order
    })),
    mandates: dossier.mandates.map((mandate) => ({
      id: mandate.id,
      order: mandate.order,
      title: mandate.title,
      question: mandate.question,
      intro: mandate.intro,
      objective: mandate.objective,
      placeToReach: mandate.placeToReach,
      observationTask: mandate.observationTask,
      required: stringArray(mandate.required),
      kind: mandate.kind === "place_answer" ? "place-answer" as const : mandate.kind,
      focusNodeId: mandate.focusNodeId,
      sourceNodeId: mandate.sourceNodeId,
      targetNodeId: mandate.targetNodeId,
      aliases: stringArray(mandate.aliases),
      keywords: stringArray(mandate.keywords),
      availableDocumentIds: stringArray(mandate.availableDocumentIds),
      rewardDocumentIds: stringArray(mandate.rewardDocumentIds),
      unlockedNodeIds: stringArray(mandate.unlockedNodeIds),
      rewardText: mandate.rewardText,
      feedback: mandate.feedback,
      cliffhanger: mandate.cliffhanger
    })),
    documents: dossier.documents.map((document) => ({
      id: document.id,
      nodeId: document.nodeId,
      title: document.title,
      kind: document.kind,
      excerpt: document.excerpt,
      content: document.content,
      sourceLabel: document.sourceLabel,
      dateLabel: document.dateLabel,
      reliability: document.reliability
    })),
    liveUnlocks: dossier.liveUnlocks.map((unlock) => ({
      id: unlock.id,
      nodeId: unlock.nodeId,
      title: unlock.title,
      description: unlock.description,
      unlockRadiusM: unlock.unlockRadiusM,
      unlockedContent: unlock.unlockedContent
    })),
    userConnections: dossier.userConnections.map((connection) => ({
      id: connection.id,
      sourceId: connection.sourceId,
      targetId: connection.targetId,
      sourceTitle: connection.source.title,
      targetTitle: connection.target.title,
      label: connection.label,
      description: connection.description
    })),
    userTheories: dossier.userTheories.map((theory) => ({
      id: theory.id,
      title: theory.title,
      body: theory.body,
      confidence: theory.confidence
    }))
  };
}

export type WorkspaceCase = NonNullable<Awaited<ReturnType<typeof getCaseWorkspace>>>;

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
