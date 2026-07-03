import Link from "next/link";
import { Archive, MapPinned, ScrollText } from "lucide-react";
import { getCases } from "@/lib/case-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cases = await getCases();

  return (
    <main className="min-h-screen px-6 py-8 text-ink">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <img
              src="/brand/citycase-logo-symbol.png"
              alt="CityCase Nodo Intrecciato"
              className="h-12 w-12 border border-brass/40 bg-archive-850 object-cover"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-ledger">Nodo Intrecciato</p>
              <h1 className="text-2xl font-semibold">CITYCASE</h1>
            </div>
          </div>
          <div className="text-right text-sm text-archive-500">
            <p>Workspace investigativo</p>
            <p>Auth mock: demo-user</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="flex flex-col justify-between border border-white/10 bg-archive-900/70 p-6 shadow-panel">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-brass">Fascicoli storici</p>
              <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">
                Indaga casi reali come un archivio vivo, non come un gioco a livelli.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-archive-500">
                Esplora nodi, fonti, connessioni e luoghi. La mappa è il tavolo da lavoro: ogni scheda conserva attendibilità, documenti e appunti personali.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
              <Metric icon={<Archive size={18} />} label="Fascicoli" value={cases.length} />
              <Metric icon={<MapPinned size={18} />} label="Città" value={new Set(cases.map((item) => item.city.name)).size} />
              <Metric icon={<ScrollText size={18} />} label="Fonti demo" value={cases.reduce((sum, item) => sum + item.counts.documents, 0)} />
            </div>
          </section>

          <section className="grid gap-4">
            {cases.map((item) => (
              <Link
                key={item.id}
                href={`/cases/${item.id}`}
                className="group border border-white/10 bg-archive-850/80 p-5 transition hover:border-brass/60 hover:bg-archive-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-ledger">Caso {item.caseNumber}</p>
                    <h3 className="mt-2 text-2xl font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-archive-500">
                      {item.city.name}, {item.year}
                    </p>
                  </div>
                  <span className="border border-brass/40 px-3 py-1 text-xs uppercase tracking-[0.18em] text-brass">
                    Apri
                  </span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-archive-500">{item.summary}</p>
                <div className="mt-5 grid gap-3 text-xs text-archive-500 sm:grid-cols-4">
                  <span>{item.counts.nodes} nodi</span>
                  <span>{item.counts.documents} documenti</span>
                  <span>{item.counts.questions} domande</span>
                  <span>{item.progressPercent}% progresso</span>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border border-white/10 bg-black/20 p-4">
      <div className="text-brass">{icon}</div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-archive-500">{label}</p>
    </div>
  );
}
