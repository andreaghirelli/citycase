import { PrismaClient, ReliabilityLevel, NodeType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.userTheory.deleteMany();
  await prisma.userConnection.deleteMany();
  await prisma.userNote.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.liveUnlock.deleteMany();
  await prisma.question.deleteMany();
  await prisma.document.deleteMany();
  await prisma.nodeConnection.deleteMany();
  await prisma.node.deleteMany();
  await prisma.case.deleteMany();
  await prisma.city.deleteMany();

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
    node(case001.id, "place", "Voltone Teodoli", "Passaggio storico", "Un luogo di attraversamento nel centro di Forlì, trattato nel fascicolo come punto sensibile per ricostruire tragitti e avvistamenti.", "Centro storico di Forlì", 44.22295, 12.04165, "documented", 1),
    node(case001.id, "place", "Palazzo Manzoni", "Residenza familiare", "La dimora associata alla famiglia Manzoni e al contesto sociale in cui matura il caso.", "Corso Giuseppe Garibaldi, Forlì", 44.22178, 12.03892, "documented", 2),
    node(case001.id, "place", "Chiesa della Santissima Trinità", "Luogo religioso", "Nodo utile per leggere rituali, memoria pubblica e possibili testimonianze raccolte dopo il delitto.", "Piazza Melozzo degli Ambrogi, Forlì", 44.22224, 12.04294, "documented", 3),
    node(case001.id, "place", "Via Francesco Canestri", "Asse urbano", "Una via cittadina inserita nella mappa del percorso ipotizzato per la sera del 26 maggio 1817.", "Via Francesco Canestri, Forlì", 44.22331, 12.03978, "probable", 4),
    node(case001.id, "place", "Via Goffredo Mameli", "Asse urbano", "Un tratto urbano secondario che aiuta a verificare distanze, angoli ciechi e tempi di movimento.", "Via Goffredo Mameli, Forlì", 44.22404, 12.04334, "probable", 5),
    node(case001.id, "person", "Domenico Manzoni", "Vittima", "Figura centrale del fascicolo. La sua posizione pubblica, le relazioni familiari e il patrimonio rendono il caso più complesso di un semplice episodio criminale.", undefined, undefined, undefined, "verified", 6),
    node(case001.id, "person", "Gertruda Versari", "Relazione familiare", "Presenza ricorrente nelle memorie sul caso, utile per interpretare dinamiche private e conseguenze ereditarie.", undefined, undefined, undefined, "documented", 7),
    node(case001.id, "person", "Antonio Canova", "Scultore", "Il suo nome compare nel fascicolo per il monumento funebre e per la rete culturale legata alla famiglia Manzoni.", undefined, undefined, undefined, "documented", 8),
    node(case001.id, "person", "Oliverotto Fabretti", "Possibile testimone o intermediario", "Figura laterale ma intrigante, indicata come punto di passaggio tra voci cittadine e ricostruzione documentaria.", undefined, undefined, undefined, "oral_tradition", 9),
    node(case001.id, "person", "Investigatore anonimo del 1817", "Voce del fascicolo", "Una funzione narrativa e archivistica: raccoglie tracce, contraddizioni e appunti senza sostituirsi alle fonti.", undefined, undefined, undefined, "citycase_hypothesis", 10),
    node(case001.id, "event", "Sera del 26 maggio 1817", "Evento cardine", "La finestra temporale principale: movimenti, incontri e silenzi devono essere confrontati con i luoghi della mappa.", undefined, undefined, undefined, "documented", 11),
    node(case001.id, "object", "Danzatrice Manzoni", "Opera e memoria", "Oggetto culturale citato nel fascicolo per collegare storia familiare, committenze artistiche e memoria pubblica.", undefined, undefined, undefined, "documented", 12)
  ]);

  const byTitle = Object.fromEntries(nodes.map((item) => [item.title, item]));

  await prisma.document.createMany({
    data: [
      doc(case001.id, byTitle["Domenico Manzoni"].id, "Articolo sull'omicidio", "ritaglio", "Un resoconto sintetico dell'evento, con enfasi sulle circostanze e sulle reazioni in città.", "Il documento riassume l'uccisione di Domenico Manzoni e suggerisce che il delitto abbia prodotto un'immediata frattura nella memoria pubblica forlivese.", "Archivio demo CityCase", "1817", "documented"),
      doc(case001.id, byTitle["Domenico Manzoni"].id, "Scheda biografica Manzoni", "scheda", "Profilo essenziale della vittima e del suo ambiente sociale.", "La scheda raccoglie dati biografici, relazioni familiari e contesto patrimoniale, lasciando aperta la domanda sul peso politico e privato della figura di Manzoni.", "Archivio demo CityCase", "XIX secolo", "verified"),
      doc(case001.id, byTitle["Voltone Teodoli"].id, "Mappa del percorso", "mappa", "Tracciato di lavoro per confrontare luoghi, distanze e sequenza temporale.", "La mappa non pretende di chiudere il caso: evidenzia invece i punti urbani da verificare nella ricostruzione della sera del 26 maggio.", "Elaborazione CityCase", "2026", "citycase_hypothesis"),
      doc(case001.id, byTitle["Antonio Canova"].id, "Nota sul monumento funebre", "nota archivistica", "Appunto sul ruolo della memoria funeraria nella costruzione del caso.", "La nota collega Canova alla memoria di Manzoni e suggerisce che il monumento vada letto come indizio culturale, non solo commemorativo.", "Archivio demo CityCase", "XIX secolo", "documented"),
      doc(case001.id, byTitle["Danzatrice Manzoni"].id, "Nota sulla Danzatrice Manzoni", "nota storico-artistica", "Riferimento all'opera come traccia laterale della rete Manzoni.", "L'opera viene trattata come un nodo culturale: non prova un movente, ma illumina relazioni, status e rappresentazione pubblica della famiglia.", "Archivio demo CityCase", "XIX secolo", "probable")
    ]
  });

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
      userId: "demo-user",
      caseId: case001.id,
      status: "in_progress",
      progressPercent: 32,
      discoveredNodes: nodes.map((item) => item.id)
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
  order = 0
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
      order
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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
