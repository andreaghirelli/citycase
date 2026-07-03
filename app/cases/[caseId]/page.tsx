import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { getCaseWorkspace } from "@/lib/case-data";
import { InvestigationWorkspace } from "@/components/investigation-workspace";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const dossier = await getCaseWorkspace(caseId);

  if (!dossier) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-archive-950 text-ink">
      <section className="border-b border-white/10 bg-archive-900/90 px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-archive-500 transition hover:text-ink">
            <ArrowLeft size={16} />
            Fascicoli
          </Link>
          <div className="flex items-center gap-3 text-sm text-brass">
            <FolderOpen size={17} />
            Apertura fascicolo
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="border border-white/10 bg-archive-850 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-ledger">Caso {dossier.caseNumber}</p>
          <h1 className="mt-3 text-4xl font-semibold">{dossier.title}</h1>
          <p className="mt-2 text-archive-500">
            {dossier.city.name}, {dossier.year}
          </p>
          <p className="mt-6 leading-7 text-archive-500">{dossier.summary}</p>
          {dossier.coverNote ? <p className="mt-5 border-l-2 border-brass/70 pl-4 text-sm leading-6 text-ink">{dossier.coverNote}</p> : null}
        </div>

        <div className="grid content-start gap-4">
          <div className="grid grid-cols-3 border border-white/10 bg-archive-850 text-center">
            <Stat label="Nodi" value={dossier.nodes.length} />
            <Stat label="Documenti" value={dossier.documents.length} />
            <Stat label="Connessioni" value={dossier.connections.length} />
          </div>
          <div className="border border-white/10 bg-archive-850 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-brass">Domande aperte</p>
            <div className="mt-4 grid gap-3">
              {dossier.questions.map((question) => (
                <div key={question.id} className="border border-white/10 bg-black/20 p-3">
                  <p className="font-medium">{question.text}</p>
                  <p className="mt-1 text-sm text-archive-500">{question.context}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <InvestigationWorkspace dossier={dossier} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-white/10 p-5 last:border-r-0">
      <p className="text-3xl font-semibold text-brass">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-archive-500">{label}</p>
    </div>
  );
}
