import Link from "next/link";
import { Compass, FileText, MapPinned, ScrollText } from "lucide-react";
import { getCases } from "@/lib/case-data";
import { displayNameForUser, getCurrentUser } from "@/lib/auth";
import { LoginPanel } from "@/components/login-panel";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <LoginPanel />;
  }

  const cases = await getCases();
  const displayName = displayNameForUser(user);

  return (
    <main className="min-h-screen bg-archive-950 text-ink">
      <header className="border-b border-brass/20 bg-black/25">
        <div className="mx-auto grid max-w-[1760px] gap-4 px-6 py-5 lg:grid-cols-[18rem_1fr_18rem]">
          <Link href="/" className="flex items-center gap-4">
            <img src="/brand/citycase-logo-symbol.png" alt="CityCase Nodo Intrecciato" className="h-14 w-14 object-cover" />
            <div>
              <h1 className="text-3xl font-semibold tracking-wide">CITYCASE</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-ink/70">Archivio investigativo</p>
            </div>
          </Link>
          <div className="hidden items-center justify-center gap-8 text-sm uppercase tracking-[0.2em] text-archive-500 lg:flex">
            <span>Scrivania</span>
            <span>Diario</span>
            <span>Lavagna</span>
            <span>Atlante</span>
          </div>
          <div className="flex items-center justify-start gap-3 lg:justify-end">
            <div className="grid h-11 w-11 place-items-center border border-brass/40 bg-archive-850 text-brass">
              <Compass size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs text-archive-500">Analista</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1760px] gap-5 px-6 py-5 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-r border-brass/15 pr-5">
          <p className="text-xs uppercase tracking-[0.24em] text-brass">Progresso del caso</p>
          <div className="mt-6 grid h-36 w-36 place-items-center rounded-full border-[10px] border-archive-700 bg-black/30 text-3xl font-semibold text-brass">
            {cases[0]?.progressPercent ?? 0}%
          </div>
          <p className="mt-4 text-sm text-ink/75">Indagine in corso</p>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-[0.24em] text-brass">Domande principali</p>
            <div className="mt-4 grid gap-4 text-sm text-ink/80">
              {cases[0]?.questions.map((question, index) => (
                <Question key={question.id} text={question.text} progress={Math.max(12, cases[0].progressPercent - index * 8)} />
              ))}
            </div>
          </div>
        </aside>

        <section className="min-h-[42rem] overflow-hidden border border-brass/20 bg-black/20 shadow-panel">
          <div className="relative min-h-[34rem] bg-[url('/brand/citycase-brand-board.png')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/75" />
            <div className="absolute inset-0 map-grid opacity-25" />
            <div className="relative grid min-h-[34rem] content-between p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="border border-white/15 bg-black/55 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-ink/75">Benvenuto, {displayName}</p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-ink/80">Esplora i luoghi, consulta i documenti e ricostruisci la verità.</p>
                  <p className="mt-3 text-right font-serif italic text-brass">- L'Archivista</p>
                </div>
                <div className="flex gap-2">
                  <button className="grid h-10 w-10 place-items-center border border-white/15 bg-black/45 text-ink">-</button>
                  <button className="grid h-10 w-10 place-items-center border border-white/15 bg-black/45 text-ink">+</button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {cases.map((item, index) => (
                  <Link key={item.id} href={`/cases/${item.id}`} className="group border border-brass/30 bg-black/65 p-5 transition hover:bg-black/80">
                    <p className="text-xs uppercase tracking-[0.22em] text-brass">Fascicolo {item.caseNumber}</p>
                    <h2 className="mt-2 text-2xl font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm uppercase tracking-[0.2em] text-ink/70">
                      {item.city.name}, {item.year}
                    </p>
                    <div className="mt-5 flex items-center gap-4 text-xs text-ink/65">
                      <span>{item.counts.nodes} nodi</span>
                      <span>{item.counts.documents} documenti</span>
                      <span>{item.progressPercent}%</span>
                    </div>
                    <span className="mt-5 inline-flex border border-brass/50 px-4 py-2 text-xs uppercase tracking-[0.18em] text-brass">Esplora</span>
                  </Link>
                ))}
                {!cases.length ? <p className="text-sm text-archive-500">Nessun fascicolo caricato.</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-brass/20 p-5 md:grid-cols-3">
            <Feature icon={<MapPinned size={18} />} title="La città è il tabellone" body="Una mappa viva e interrogabile. Ogni luogo è una porta sulla storia." />
            <Feature icon={<FileText size={18} />} title="Storia vera, emozione vera" body="Documenti, persone e tracce restano nel tuo archivio personale." />
            <Feature icon={<ScrollText size={18} />} title="Ogni scoperta conta" body="Note, connessioni e progresso appartengono al tuo profilo." />
          </div>

          {cases[0] ? (
            <div className="grid gap-4 border-t border-brass/20 p-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-brass">Fascicolo attivo</p>
                <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <h3 className="text-3xl font-semibold">{cases[0].title}</h3>
                    <p className="mt-1 text-sm text-archive-500">
                      {cases[0].city.name}, {cases[0].year}
                    </p>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-archive-500">{cases[0].summary}</p>
                  </div>
                  <Link href={`/cases/${cases[0].id}`} className="bg-brass px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-black">
                    Entra nel fascicolo
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3 lg:grid-cols-1">
                <Link href={`/cases/${cases[0].id}?view=diary`} className="border border-white/10 bg-black/25 px-4 py-3 text-ink/85 transition hover:border-brass/50 hover:text-brass">
                  Diario e note
                </Link>
                <Link href={`/cases/${cases[0].id}?view=board`} className="border border-white/10 bg-black/25 px-4 py-3 text-ink/85 transition hover:border-brass/50 hover:text-brass">
                  Lavagna connessioni
                </Link>
                <Link href={`/cases/${cases[0].id}?view=atlas`} className="border border-white/10 bg-black/25 px-4 py-3 text-ink/85 transition hover:border-brass/50 hover:text-brass">
                  Atlante scoperte
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function Question({ text, progress }: { text: string; progress: number }) {
  return (
    <div>
      <p>{text}</p>
      <div className="mt-2 h-1.5 bg-white/10">
        <div className="h-full bg-brass" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-4">
      <div className="text-brass">{icon}</div>
      <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-archive-500">{body}</p>
    </div>
  );
}
