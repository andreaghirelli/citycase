"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Crosshair, FileText, MapPinned, Plus, Radar, Save, Search, UserRound } from "lucide-react";
import type { WorkspaceCase } from "@/lib/case-data";

type NodeItem = WorkspaceCase["nodes"][number];
type UserConnection = WorkspaceCase["userConnections"][number];
type LiveHit = { id: string; nodeId: string; title: string; description: string; unlockedContent: string; distance: number };

declare global {
  interface Window {
    google?: any;
    initCityCaseMap?: () => void;
  }
}

const nodeIcons: Record<string, React.ReactNode> = {
  person: <UserRound size={15} />,
  place: <MapPinned size={15} />,
  document: <FileText size={15} />,
  event: <Radar size={15} />,
  object: <BookOpen size={15} />,
  hypothesis: <Search size={15} />,
  question: <Search size={15} />
};

export function InvestigationWorkspace({ dossier }: { dossier: WorkspaceCase }) {
  const [selectedId, setSelectedId] = useState(dossier.nodes[0]?.id ?? "");
  const [opened, setOpened] = useState<string[]>(dossier.nodes.slice(0, 3).map((node) => node.id));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(dossier.nodes.map((node) => [node.id, node.note])));
  const [connections, setConnections] = useState<UserConnection[]>(dossier.userConnections);
  const [sourceId, setSourceId] = useState(dossier.nodes[0]?.id ?? "");
  const [targetId, setTargetId] = useState(dossier.nodes[1]?.id ?? "");
  const [label, setLabel] = useState("potrebbe spiegare");
  const [liveHits, setLiveHits] = useState<LiveHit[]>([]);
  const [liveStatus, setLiveStatus] = useState("Non verificato");

  const selected = dossier.nodes.find((node) => node.id === selectedId) ?? dossier.nodes[0];
  const places = dossier.nodes.filter((node) => node.type === "place" && node.latitude && node.longitude);
  const timeline = dossier.nodes.filter((node) => node.type === "event" || node.dateLabel).sort((a, b) => a.order - b.order);

  function openNode(nodeId: string) {
    setSelectedId(nodeId);
    setOpened((current) => [nodeId, ...current.filter((id) => id !== nodeId)].slice(0, 6));
  }

  async function saveNote() {
    if (!selected) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: selected.id, body: notes[selected.id] ?? "" })
    });
  }

  async function createConnection() {
    const response = await fetch("/api/user-connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: dossier.id, sourceId, targetId, label })
    });
    if (response.ok) {
      const payload = (await response.json()) as { connection: UserConnection };
      setConnections((current) => [payload.connection, ...current]);
    }
  }

  function checkLive() {
    if (!navigator.geolocation) {
      setLiveStatus("Geolocalizzazione non disponibile");
      return;
    }

    setLiveStatus("Controllo posizione in corso...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const response = await fetch("/api/live-unlocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: dossier.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        });
        const payload = (await response.json()) as { unlocked: LiveHit[] };
        setLiveHits(payload.unlocked ?? []);
        setLiveStatus(payload.unlocked?.length ? "Contenuti Live sbloccati" : "Nessun luogo vicino rilevato");
      },
      () => setLiveStatus("Permesso posizione negato o non disponibile"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <section className="mx-auto max-w-[1800px] border-t border-white/10 bg-archive-950">
      <header className="grid gap-3 border-b border-white/10 bg-archive-900 px-4 py-3 lg:grid-cols-[18rem_1fr_22rem]">
        <div className="flex items-center gap-3">
          <img
            src="/brand/citycase-logo-symbol.png"
            alt="CityCase Nodo Intrecciato"
            className="h-11 w-11 border border-brass/40 bg-archive-850 object-cover"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-ledger">CITYCASE</p>
            <p className="text-sm text-archive-500">Nodo Intrecciato</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-archive-500">Caso {dossier.caseNumber}</p>
          <h2 className="text-xl font-semibold">{dossier.title}</h2>
        </div>
        <div className="self-center">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-archive-500">
            <span>Progresso</span>
            <span>{dossier.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 bg-black/40">
            <div className="h-full bg-brass" style={{ width: `${dossier.progressPercent}%` }} />
          </div>
        </div>
      </header>

      <div className="grid min-h-[760px] grid-rows-[auto_1fr_auto] lg:grid-cols-[18rem_minmax(0,1fr)_22rem] lg:grid-rows-[1fr_auto]">
        <aside className="thin-scrollbar max-h-[760px] overflow-auto border-b border-white/10 bg-archive-900/80 p-4 lg:border-b-0 lg:border-r">
          <PanelTitle title="Domande investigative" />
          <div className="grid gap-3">
            {dossier.questions.map((question) => (
              <div key={question.id} className="border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-medium">{question.text}</p>
                <p className="mt-1 text-xs leading-5 text-archive-500">{question.context}</p>
              </div>
            ))}
          </div>

          <PanelTitle title="Nodi scoperti" className="mt-6" />
          <div className="grid gap-2">
            {dossier.nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => openNode(node.id)}
                className={`flex items-center gap-2 border px-3 py-2 text-left text-sm transition ${
                  node.id === selected?.id ? "border-brass/70 bg-brass/10 text-brass" : "border-white/10 bg-archive-850 hover:border-white/25"
                }`}
              >
                <span className="text-ledger">{nodeIcons[node.type]}</span>
                <span className="min-w-0 truncate">{node.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid min-h-[620px] grid-rows-[1fr_auto]">
          <InvestigationMap dossier={dossier} places={places} selected={selected} onSelect={openNode} />
          <div className="border-t border-white/10 bg-archive-900 p-4">
            <PanelTitle title="Timeline" compact />
            <div className="flex gap-3 overflow-x-auto pb-1">
              {timeline.map((node) => (
                <button key={node.id} onClick={() => openNode(node.id)} className="min-w-64 border border-white/10 bg-black/20 p-3 text-left">
                  <p className="text-xs uppercase tracking-[0.18em] text-brass">{node.dateLabel ?? "Evento"}</p>
                  <p className="mt-1 font-medium">{node.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-archive-500">{node.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="thin-scrollbar max-h-[760px] overflow-auto border-t border-white/10 bg-archive-900/80 p-4 lg:border-l lg:border-t-0">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ledger">{selected.type}</p>
                  <h3 className="mt-1 text-2xl font-semibold">{selected.title}</h3>
                  <p className="mt-1 text-sm text-archive-500">{selected.subtitle}</p>
                </div>
                <span className="border border-brass/40 px-2 py-1 text-xs text-brass">{selected.reliability}</span>
              </div>
              <p className="mt-5 text-sm leading-6 text-archive-500">{selected.description}</p>
              {selected.address ? <p className="mt-3 text-sm text-ledger">{selected.address}</p> : null}

              <PanelTitle title="Documenti collegati" className="mt-6" />
              <div className="grid gap-3">
                {selected.documents.length ? (
                  selected.documents.map((document) => (
                    <details key={document.id} className="border border-white/10 bg-black/20 p-3">
                      <summary className="cursor-pointer text-sm font-medium">{document.title}</summary>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-brass">{document.kind}</p>
                      <p className="mt-2 text-sm leading-6 text-archive-500">{document.content}</p>
                    </details>
                  ))
                ) : (
                  <p className="text-sm text-archive-500">Nessun documento collegato a questo nodo.</p>
                )}
              </div>

              <PanelTitle title="Connessioni ufficiali" className="mt-6" />
              <ConnectionList
                items={dossier.connections.filter((connection) => connection.sourceId === selected.id || connection.targetId === selected.id)}
              />

              {selected.type === "place" && selected.latitude && selected.longitude ? (
                <>
                  <PanelTitle title="Street View" className="mt-6" />
                  <StreetViewPanel node={selected} />
                </>
              ) : null}

              <PanelTitle title="Note personali" className="mt-6" />
              <textarea
                value={notes[selected.id] ?? ""}
                onChange={(event) => setNotes((current) => ({ ...current, [selected.id]: event.target.value }))}
                className="h-28 w-full resize-none border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-brass/60"
                placeholder="Aggiungi una nota investigativa..."
              />
              <button onClick={saveNote} className="mt-2 flex w-full items-center justify-center gap-2 border border-brass/50 bg-brass/10 px-3 py-2 text-sm text-brass">
                <Save size={15} />
                Salva nota
              </button>
            </>
          ) : null}
        </aside>

        <footer className="border-t border-white/10 bg-archive-900 p-4 lg:col-span-3">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
            <div>
              <PanelTitle title="Nodi aperti" compact />
              <div className="flex flex-wrap gap-2">
                {opened.map((id) => {
                  const node = dossier.nodes.find((item) => item.id === id);
                  return node ? (
                    <button key={id} onClick={() => openNode(id)} className="border border-white/10 bg-black/20 px-3 py-2 text-sm hover:border-brass/50">
                      {node.title}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
            <div>
              <PanelTitle title="Connessione personale" compact />
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="border border-white/10 bg-black/30 px-3 py-2 text-sm">
                  {dossier.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
                </select>
                <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="border border-white/10 bg-black/30 px-3 py-2 text-sm">
                  {dossier.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
                </select>
              </div>
              <div className="mt-2 flex gap-2">
                <input value={label} onChange={(event) => setLabel(event.target.value)} className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm" />
                <button onClick={createConnection} className="grid h-10 w-10 place-items-center border border-brass/50 text-brass" title="Crea connessione">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <PanelTitle title="Live" compact />
              <button onClick={checkLive} className="flex w-full items-center justify-center gap-2 border border-ledger/40 bg-ledger/10 px-3 py-2 text-sm text-ledger">
                <Crosshair size={15} />
                Verifica posizione
              </button>
              <p className="mt-2 text-xs text-archive-500">{liveStatus}</p>
              {liveHits.map((hit) => (
                <p key={hit.id} className="mt-2 border border-brass/40 bg-brass/10 p-2 text-xs leading-5 text-ink">
                  {hit.title}: {hit.unlockedContent} ({hit.distance}m)
                </p>
              ))}
            </div>
          </div>
          {connections.length ? (
            <div className="mt-4 border-t border-white/10 pt-3 text-xs text-archive-500">
              Connessioni personali: {connections.map((connection) => `${connection.sourceTitle} ${connection.label} ${connection.targetTitle}`).join(" | ")}
            </div>
          ) : null}
        </footer>
      </div>
    </section>
  );
}

function InvestigationMap({ dossier, places, selected, onSelect }: { dossier: WorkspaceCase; places: NodeItem[]; selected?: NodeItem; onSelect: (nodeId: string) => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) {
      setGoogleReady(true);
      return;
    }
    window.initCityCaseMap = () => setGoogleReady(true);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initCityCaseMap`;
    script.async = true;
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!googleReady || !mapRef.current || !window.google?.maps) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: dossier.city.latitude, lng: dossier.city.longitude },
      zoom: 16,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: true,
      styles: [{ elementType: "geometry", stylers: [{ color: "#151b23" }] }, { elementType: "labels.text.fill", stylers: [{ color: "#d9ded8" }] }]
    });
    places.forEach((place) => {
      const marker = new window.google.maps.Marker({
        position: { lat: place.latitude, lng: place.longitude },
        map,
        title: place.title
      });
      marker.addListener("click", () => onSelect(place.id));
    });
  }, [dossier.city.latitude, dossier.city.longitude, googleReady, onSelect, places]);

  const bounds = useMemo(() => {
    const lats = places.map((place) => place.latitude ?? dossier.city.latitude);
    const lngs = places.map((place) => place.longitude ?? dossier.city.longitude);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
  }, [dossier.city.latitude, dossier.city.longitude, places]);

  if (apiKey) {
    return <div ref={mapRef} className="min-h-[520px] w-full bg-archive-850" />;
  }

  return (
    <div className="map-grid relative min-h-[520px] overflow-hidden bg-archive-850">
      <div className="absolute left-4 top-4 z-10 border border-white/10 bg-archive-900/90 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-brass">Mappa Forlì</p>
        <p className="mt-1 text-xs text-archive-500">Aggiungi una Google Maps API key per la mappa reale.</p>
      </div>
      {places.map((place) => {
        const x = normalize(place.longitude ?? dossier.city.longitude, bounds.minLng, bounds.maxLng);
        const y = normalize(place.latitude ?? dossier.city.latitude, bounds.minLat, bounds.maxLat);
        return (
          <button
            key={place.id}
            onClick={() => onSelect(place.id)}
            className={`absolute max-w-44 -translate-x-1/2 -translate-y-1/2 border px-3 py-2 text-left text-xs shadow-panel ${
              selected?.id === place.id ? "border-brass bg-brass text-black" : "border-white/15 bg-archive-900 text-ink"
            }`}
            style={{ left: `${10 + x * 80}%`, top: `${90 - y * 80}%` }}
          >
            <MapPinned size={14} className="mb-1" />
            {place.title}
          </button>
        );
      })}
    </div>
  );
}

function StreetViewPanel({ node }: { node: NodeItem }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (window.google?.maps && ref.current && node.latitude && node.longitude) {
        new window.google.maps.StreetViewPanorama(ref.current, {
          position: { lat: node.latitude, lng: node.longitude },
          pov: { heading: 165, pitch: 0 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: false
        });
        setReady(true);
        window.clearInterval(timer);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [node.latitude, node.longitude]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="border border-white/10 bg-black/20 p-3 text-sm text-archive-500">
        Street View richiede `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
      </div>
    );
  }

  return (
    <div className="relative h-52 overflow-hidden border border-white/10 bg-black/20">
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-archive-500">
          <span className="flex items-center gap-2">
            <MapPinned size={16} />
            Caricamento Street View
          </span>
        </div>
      ) : null}
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}

function ConnectionList({ items }: { items: Array<{ id: string; sourceTitle: string; targetTitle: string; label: string; reliability: string; description: string | null }> }) {
  if (!items.length) {
    return <p className="text-sm text-archive-500">Nessuna connessione ufficiale per il nodo selezionato.</p>;
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.id} className="border border-white/10 bg-black/20 p-3 text-sm">
          <p>
            <span className="text-ink">{item.sourceTitle}</span> <span className="text-brass">{item.label}</span>{" "}
            <span className="text-ink">{item.targetTitle}</span>
          </p>
          <p className="mt-1 text-xs text-archive-500">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

function PanelTitle({ title, className = "", compact = false }: { title: string; className?: string; compact?: boolean }) {
  return <h4 className={`${compact ? "mb-2" : "mb-3"} ${className} text-xs font-semibold uppercase tracking-[0.2em] text-brass`}>{title}</h4>;
}

function normalize(value: number, min: number, max: number) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}
