import { pbkdf2Sync, randomBytes } from "node:crypto";
import { MandateKind, Prisma, PrismaClient, ReliabilityLevel, NodeType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.userTheory.deleteMany();
  await prisma.userConnection.deleteMany();
  await prisma.userNote.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.liveUnlock.deleteMany();
  await prisma.investigativeMandate.deleteMany();
  await prisma.question.deleteMany();
  await prisma.document.deleteMany();
  await prisma.nodeConnection.deleteMany();
  await prisma.node.deleteMany();
  await prisma.case.deleteMany();
  await prisma.city.deleteMany();
  await prisma.user.deleteMany();

  const demoUser = await prisma.user.create({
    data: {
      nickname: "archivista",
      email: "archivista@citycase.it",
      displayName: "Archivista",
      passwordHash: hashPassword("citycase1817")
    }
  });

  const city = await prisma.city.create({
    data: {
      name: "Forlì",
      country: "Italia",
      latitude: 44.2227,
      longitude: 12.0407
    }
  });

  const case001 = await prisma.case.create({
    data: {
      caseNumber: "001",
      title: "Il Delitto di Domenico Manzoni",
      subtitle: "Forlì, 1817",
      year: 1817,
      cityId: city.id,
      summary:
        "Un fascicolo investigativo sul delitto di Domenico Manzoni, figura legata alla storia cittadina e a una rete di relazioni politiche, familiari e artistiche.",
      coverNote:
        "Ricostruisci luoghi, documenti e moventi senza trasformare la storia in spettacolo: CityCase è un archivio esplorabile."
    }
  });

  const nodes = await Promise.all([
    node(case001.id, "place", "Voltone Teodoli", "Passaggio storico", "Luogo dell'aggressione mortale a Domenico Manzoni. Prima di cercare un movente, il fascicolo chiede di confermare il punto esatto.", "Centro storico di Forlì", 44.22295, 12.04165, "documented", 1, {
      discovered: true,
      metadata: {
        externalId: "N001",
        liveEnabled: true,
        initiallyVisible: true,
        role: "Luogo dell'aggressione mortale a Domenico Manzoni.",
        archivistMessage: "Prima di cercare un assassino dobbiamo essere certi del luogo dell'aggressione. Raggiungi il Voltone e osserva.",
        investigationQuestion: "Secondo le fonti consultate, in quale luogo avvenne l'aggressione?",
        observationTask: "Osserva la conformazione del luogo. Quali elementi potrebbero aver favorito un'aggressione? Annota le tue osservazioni nel Diario.",
        connectedPeople: ["Domenico Manzoni"],
        connectedPlaces: ["Palazzo Manzoni", "Via Francesco Canestri"],
        validationType: "text",
        acceptedAnswers: ["Voltone", "Voltone Teodoli", "Il Voltone"],
        unlocks: ["N002"]
      }
    }),
    node(case001.id, "place", "Palazzo Manzoni", "Residenza familiare", "La dimora associata alla famiglia Manzoni. Si sblocca quando il Voltone entra nella ricostruzione.", "Corso Giuseppe Garibaldi, Forlì", 44.22178, 12.03892, "documented", 2, {
      discovered: false,
      metadata: { externalId: "N002", liveEnabled: true, initiallyVisible: false }
    }),
    node(case001.id, "place", "Chiesa della Santissima Trinità", "Luogo religioso", "Nodo utile per leggere rituali, memoria pubblica e possibili testimonianze raccolte dopo il delitto.", "Piazza Melozzo degli Ambrogi, Forlì", 44.22224, 12.04294, "documented", 3, {
      discovered: false,
      metadata: { externalId: "N003", initiallyVisible: false }
    }),
    node(case001.id, "place", "Via Francesco Canestri", "Asse urbano", "Una via cittadina inserita nella mappa del percorso ipotizzato per la sera del 26 maggio 1817.", "Via Francesco Canestri, Forlì", 44.22331, 12.03978, "probable", 4, {
      discovered: false,
      metadata: { externalId: "N004", initiallyVisible: false }
    }),
    node(case001.id, "place", "Via Goffredo Mameli", "Asse urbano", "Un tratto urbano secondario che aiuta a verificare distanze, angoli ciechi e tempi di movimento.", "Via Goffredo Mameli, Forlì", 44.22404, 12.04334, "probable", 5, {
      discovered: false,
      metadata: { externalId: "N005", initiallyVisible: false }
    }),
    node(case001.id, "person", "Domenico Manzoni", "Vittima", "Figura centrale del fascicolo. La sua posizione pubblica, le relazioni familiari e il patrimonio rendono il caso più complesso di un semplice episodio criminale.", undefined, undefined, undefined, "verified", 6, {
      discovered: true,
      metadata: { externalId: "P001", initiallyVisible: true }
    }),
    node(case001.id, "person", "Gertruda Versari", "Relazione familiare", "Presenza ricorrente nelle memorie sul caso, utile per interpretare dinamiche private e conseguenze ereditarie.", undefined, undefined, undefined, "documented", 7, { discovered: false }),
    node(case001.id, "person", "Antonio Canova", "Scultore", "Il suo nome compare nel fascicolo per il monumento funebre e per la rete culturale legata alla famiglia Manzoni.", undefined, undefined, undefined, "documented", 8, { discovered: false }),
    node(case001.id, "person", "Oliverotto Fabretti", "Possibile testimone o intermediario", "Figura laterale ma intrigante, indicata come punto di passaggio tra voci cittadine e ricostruzione documentaria.", undefined, undefined, undefined, "oral_tradition", 9, { discovered: false }),
    node(case001.id, "person", "Investigatore anonimo del 1817", "Voce del fascicolo", "Una funzione narrativa e archivistica: raccoglie tracce, contraddizioni e appunti senza sostituirsi alle fonti.", undefined, undefined, undefined, "citycase_hypothesis", 10, { discovered: true }),
    node(case001.id, "event", "Sera del 26 maggio 1817", "Evento cardine", "La finestra temporale principale: movimenti, incontri e silenzi devono essere confrontati con i luoghi della mappa.", undefined, undefined, undefined, "documented", 11, { discovered: true }),
    node(case001.id, "object", "Danzatrice Manzoni", "Opera e memoria", "Oggetto culturale citato nel fascicolo per collegare storia familiare, committenze artistiche e memoria pubblica.", undefined, undefined, undefined, "documented", 12, { discovered: false })
  ]);

  const byTitle = Object.fromEntries(nodes.map((item) => [item.title, item]));

  const seededDocuments = [];
  for (const document of [
    doc(case001.id, byTitle["Voltone Teodoli"].id, "DOC001 — Scheda Voltone Teodoli", "scheda luogo", "Passaggio coperto nel centro storico di Forlì.", "Il Voltone è trattato come punto di verifica: un luogo stretto, attraversabile e adatto a confrontare tempi, visuali e possibili avvicinamenti.", "Archivio demo CityCase", "1817", "documented"),
    doc(case001.id, byTitle["Voltone Teodoli"].id, "DOC002 — Estratto storico sul delitto", "estratto", "Le fonti collocano l'aggressione in corrispondenza del Voltone.", "L'estratto non chiude il caso: indica il luogo dell'aggressione e costringe a distinguere tra memoria cittadina, percorso e ricostruzione coerente.", "Archivio demo CityCase", "1817", "documented"),
    doc(case001.id, byTitle["Voltone Teodoli"].id, "DOC003 — Mappa del percorso", "mappa", "Tracciato di lavoro per confrontare luoghi, distanze e sequenza temporale.", "La mappa evidenzia il Voltone come primo punto urbano da verificare nella ricostruzione della sera del 26 maggio.", "Elaborazione CityCase", "2026", "citycase_hypothesis"),
    doc(case001.id, byTitle["Domenico Manzoni"].id, "Scheda biografica Manzoni", "scheda", "Profilo essenziale della vittima e del suo ambiente sociale.", "La scheda raccoglie dati biografici, relazioni familiari e contesto patrimoniale, lasciando aperta la domanda sul peso politico e privato della figura di Manzoni.", "Archivio demo CityCase", "XIX secolo", "verified"),
    doc(case001.id, byTitle["Antonio Canova"].id, "Nota sul monumento funebre", "nota archivistica", "Appunto sul ruolo della memoria funeraria nella costruzione del caso.", "La nota collega Canova alla memoria di Manzoni e suggerisce che il monumento vada letto come indizio culturale, non solo commemorativo.", "Archivio demo CityCase", "XIX secolo", "documented"),
    doc(case001.id, byTitle["Danzatrice Manzoni"].id, "Nota sulla Danzatrice Manzoni", "nota storico-artistica", "Riferimento all'opera come traccia laterale della rete Manzoni.", "L'opera viene trattata come un nodo culturale: non prova un movente, ma illumina relazioni, status e rappresentazione pubblica della famiglia.", "Archivio demo CityCase", "XIX secolo", "probable")
  ]) {
    seededDocuments.push(await prisma.document.create({ data: document }));
  }

  const documentByTitle = Object.fromEntries(seededDocuments.map((item) => [item.title, item]));

  const connections: Array<[string, string, string, string, ReliabilityLevel]> = [
    ["Domenico Manzoni", "Palazzo Manzoni", "abitava presso", "La residenza aiuta a partire dalla dimensione domestica del caso.", "verified"],
    ["Domenico Manzoni", "Sera del 26 maggio 1817", "vittima durante", "L'evento cardine del fascicolo.", "documented"],
    ["Sera del 26 maggio 1817", "Voltone Teodoli", "possibile passaggio", "Un tratto da verificare con tempi e testimonianze.", "probable"],
    ["Voltone Teodoli", "Via Francesco Canestri", "collega a", "Connessione urbana usata per la ricostruzione del percorso.", "probable"],
    ["Via Francesco Canestri", "Via Goffredo Mameli", "percorso alternativo", "Ipotesi utile per valutare deviazioni e punti ciechi.", "citycase_hypothesis"],
    ["Gertruda Versari", "Domenico Manzoni", "legame familiare", "Relazione privata importante per capire il contesto.", "documented"],
    ["Antonio Canova", "Domenico Manzoni", "memoria funeraria", "Collegamento mediato dal monumento funebre.", "documented"],
    ["Antonio Canova", "Danzatrice Manzoni", "orizzonte artistico", "Collegamento culturale nel fascicolo demo.", "probable"],
    ["Oliverotto Fabretti", "Investigatore anonimo del 1817", "voce raccolta da", "La relazione resta incerta e va trattata come traccia orale.", "oral_tradition"],
    ["Chiesa della Santissima Trinità", "Domenico Manzoni", "memoria pubblica", "Nodo liturgico e cittadino della vicenda.", "documented"]
  ];

  for (const [source, target, label, description, reliability] of connections) {
    await prisma.nodeConnection.create({
      data: {
        caseId: case001.id,
        sourceId: byTitle[source].id,
        targetId: byTitle[target].id,
        label,
        description,
        reliability
      }
    });
  }

  await prisma.question.createMany({
    data: [
      { caseId: case001.id, text: "Chi era davvero Domenico Manzoni?", context: "Distingui profilo pubblico, rete familiare e memoria postuma.", order: 1 },
      { caseId: case001.id, text: "Cosa accadde la sera del 26 maggio 1817?", context: "Confronta timeline, luoghi e percorsi alternativi.", order: 2 },
      { caseId: case001.id, text: "Chi poteva avere interesse a eliminarlo?", context: "Costruisci ipotesi solo quando hai collegato fonti e nodi.", order: 3 }
    ]
  });

  await prisma.investigativeMandate.createMany({
    data: [
      mandate(
        case001.id,
        1,
        "N001 — Voltone Teodoli",
        "Secondo le fonti consultate, in quale luogo avvenne l'aggressione?",
        "Prima di cercare un assassino dobbiamo essere certi del luogo dell'aggressione. Raggiungi il Voltone e osserva.",
        "Conferma il luogo dell'aggressione attraverso mappa, Street View e fonti disponibili.",
        ["Apri il Voltone Teodoli", "Osserva la conformazione del luogo", "Consulta i documenti disponibili", "Scrivi la tua deduzione"],
        "place_answer",
        [],
        "Mandato validato. Fascicolo aggiornato. Nuovo luogo sbloccato: Palazzo Manzoni.",
        "La deduzione non è ancora sostenuta dalle prove raccolte. Rileggi i documenti e osserva il luogo.",
        "Il Palazzo Manzoni entra nel fascicolo: casa, reputazione e percorso ora sono nello stesso filo.",
        {
          focusNodeId: byTitle["Voltone Teodoli"].id,
          sourceNodeId: byTitle["Domenico Manzoni"].id,
          targetNodeId: byTitle["Voltone Teodoli"].id,
          aliases: ["voltone", "voltone teodoli", "il voltone"],
          availableDocumentIds: [
            documentByTitle["DOC001 — Scheda Voltone Teodoli"].id,
            documentByTitle["DOC002 — Estratto storico sul delitto"].id,
            documentByTitle["DOC003 — Mappa del percorso"].id
          ],
          unlockedNodeIds: [byTitle["Palazzo Manzoni"].id],
          placeToReach: "Voltone Teodoli",
          observationTask: "Osserva la conformazione del luogo. Quali elementi potrebbero aver favorito un'aggressione? Annota le tue osservazioni nel Diario."
        }
      )
    ]
  });

  await prisma.liveUnlock.createMany({
    data: [
      {
        caseId: case001.id,
        nodeId: byTitle["Voltone Teodoli"].id,
        title: "Sblocco Live: Voltone Teodoli",
        description: "Disponibile quando sei vicino al passaggio storico.",
        unlockRadiusM: 180,
        unlockedContent: "Sul posto, osserva l'orientamento delle vie: la ricostruzione del percorso cambia se immagini il passaggio dopo il tramonto."
      },
      {
        caseId: case001.id,
        nodeId: byTitle["Palazzo Manzoni"].id,
        title: "Sblocco Live: Palazzo Manzoni",
        description: "Disponibile presso l'area del palazzo.",
        unlockRadiusM: 180,
        unlockedContent: "La prossimità alla dimora rende evidente quanto il caso sia intrecciato alla visibilità sociale della famiglia."
      }
    ]
  });

  await prisma.userProgress.create({
    data: {
      userId: demoUser.id,
      caseId: case001.id,
      status: "in_progress",
      progressPercent: 12,
      discoveredNodes: [byTitle["Voltone Teodoli"].id, byTitle["Domenico Manzoni"].id, byTitle["Investigatore anonimo del 1817"].id, byTitle["Sera del 26 maggio 1817"].id],
      openedDocuments: [
        documentByTitle["DOC001 — Scheda Voltone Teodoli"].id,
        documentByTitle["DOC002 — Estratto storico sul delitto"].id,
        documentByTitle["DOC003 — Mappa del percorso"].id
      ]
    }
  });

  console.log("Seed CityCase completato: Caso 001 caricato da database.");
}

function node(
  caseId: string,
  type: NodeType,
  title: string,
  subtitle: string,
  description: string,
  address?: string,
  latitude?: number,
  longitude?: number,
  reliability: ReliabilityLevel = "documented",
  order = 0,
  options: { discovered?: boolean; metadata?: Prisma.InputJsonObject } = {}
) {
  return prisma.node.create({
    data: {
      caseId,
      type,
      title,
      subtitle,
      description,
      address,
      latitude,
      longitude,
      reliability,
      order,
      discovered: options.discovered ?? false,
      metadata: options.metadata
    }
  });
}

function doc(
  caseId: string,
  nodeId: string,
  title: string,
  kind: string,
  excerpt: string,
  content: string,
  sourceLabel: string,
  dateLabel: string,
  reliability: ReliabilityLevel
) {
  return { caseId, nodeId, title, kind, excerpt, content, sourceLabel, dateLabel, reliability };
}

function mandate(
  caseId: string,
  order: number,
  title: string,
  question: string,
  intro: string,
  objective: string,
  required: string[],
  kind: MandateKind,
  rewardDocumentIds: string[],
  rewardText: string,
  feedback: string,
  cliffhanger: string,
  options: {
    focusNodeId?: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    aliases?: string[];
    keywords?: string[];
    availableDocumentIds?: string[];
    unlockedNodeIds?: string[];
    placeToReach?: string;
    observationTask?: string;
  } = {}
) {
  return {
    caseId,
    order,
    title,
    question,
    intro,
    objective,
    placeToReach: options.placeToReach,
    observationTask: options.observationTask,
    required,
    kind,
    focusNodeId: options.focusNodeId,
    sourceNodeId: options.sourceNodeId,
    targetNodeId: options.targetNodeId,
    aliases: options.aliases ?? [],
    keywords: options.keywords ?? [],
    availableDocumentIds: options.availableDocumentIds ?? [],
    rewardDocumentIds,
    unlockedNodeIds: options.unlockedNodeIds ?? [],
    rewardText,
    feedback,
    cliffhanger
  };
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
