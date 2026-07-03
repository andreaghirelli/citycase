"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Box, ClipboardList, Crosshair, FileText, Home, MapPinned, Plus, Radar, Save, Search, UserRound, X } from "lucide-react";
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
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: dossier.id, nodeId })
    }).catch(() => undefined);
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
    <section className="mx-auto max-w-[1800px] border-t border-brass/20 bg-archive-950">
      <header className="grid gap-3 border-b border-brass/20 bg-black/35 px-4 py-3 lg:grid-cols-[20rem_1fr_22rem]">
        <div className="flex items-center gap-3">
          <img src="/brand/citycase-logo-symbol.png" alt="CityCase Nodo Intrecciato" className="h-12 w-12 object-cover" />
          <div>
            <p className="text-2xl font-semibold tracking-wide">CITYCASE</p>
            <p className="text-xs uppercase tracking-[0.18em] text-archive-500">Archivio investigativo</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="border-l border-brass/30 pl-6">
            <p className="text-xs uppercase tracking-[0.22em] text-brass">Fascicolo {dossier.caseNumber}</p>
            <h2 className="text-xl font-semibold uppercase tracking-[0.05em]">{dossier.title}</h2>
          </div>
          <p className="hidden text-sm uppercase tracking-[0.24em] text-ink/70 md:block">
            {dossier.city.name}, {dossier.year}
          </p>
        </div>
        <div className="flex items-center justify-end gap-5">
          <NavIcon icon={<Home size={18} />} label="Scrivania" />
          <NavIcon icon={<ClipboardList size={18} />} label="Diario" />
          <NavIcon icon={<Box size={18} />} label="Atlante" />
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <div className="grid h-9 w-9 place-items-center border border-brass/40 bg-black/30 text-brass">
              <UserRound size={17} />
            </div>
            <div>
              <p className="text-sm">{dossier.user?.nickname ?? "Analista"}</p>
              <p className="text-xs text-archive-500">Livello 1</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-h-[780px] grid-rows-[auto_1fr_auto] lg:grid-cols-[18rem_minmax(0,1fr)_24rem] lg:grid-rows-[1fr_auto]">
        <aside className="thin-scrollbar max-h-[780px] overflow-auto border-b border-brass/20 bg-black/25 p-5 lg:border-b-0 lg:border-r">
          <PanelTitle title="Progresso del caso" />
          <div className="grid h-32 w-32 place-items-center rounded-full border-[9px] border-archive-700 bg-black/30 text-3xl font-semibold text-brass">
            {dossier.progressPercent}%
          </div>

          <PanelTitle title="Domande principali" className="mt-8" />
          <div className="grid gap-3">
            {dossier.questions.map((question) => (
              <div key={question.id} className="border border-white/10 bg-black/30 p-3">
                <p className="text-sm font-medium">{question.text}</p>
                <p className="mt-1 text-xs leading-5 text-archive-500">{question.context}</p>
                <div className="mt-3 h-1 bg-white/10">
                  <div className="h-full bg-brass" style={{ width: `${18 + question.order * 14}%` }} />
                </div>
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
          <div className="border-t border-brass/20 bg-black/35 p-4">
            <PanelTitle title="Perché l'esperienza è viva" compact />
            <div className="grid gap-3 md:grid-cols-3">
              {timeline.map((node, index) => (
                <button key={node.id} onClick={() => openNode(node.id)} className="border border-white/10 bg-black/25 p-3 text-left">
                  <p className="text-xs uppercase tracking-[0.18em] text-brass">{index + 1}. {node.dateLabel ?? "Evento"}</p>
                  <p className="mt-1 font-medium">{node.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-archive-500">{node.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="thin-scrollbar max-h-[780px] overflow-auto border-t border-brass/20 bg-black/25 lg:border-l lg:border-t-0">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ledger">{selected.type}</p>
                  <h3 className="mt-1 text-2xl font-semibold uppercase tracking-[0.06em] text-brass">{selected.title}</h3>
                  <p className="mt-1 text-sm text-archive-500">{selected.subtitle}</p>
                </div>
                <X size={18} className="text-ink/70" />
              </div>
              {selected.type === "place" && selected.latitude && selected.longitude ? (
                <StreetViewPanel node={selected} compactImage />
              ) : (
                <div className="h-44 border-y border-white/10 bg-[url('/brand/citycase-brand-board.png')] bg-cover bg-center opacity-70" />
              )}
              <div className="p-5">
                <span className="border border-brass/40 px-2 py-1 text-xs text-brass">{selected.reliability}</span>
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

                <PanelTitle title="Note" className="mt-6" />
                <textarea
                  value={notes[selected.id] ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [selected.id]: event.target.value }))}
                  className="h-28 w-full resize-none border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-brass/60"
                  placeholder="Annota le tue osservazioni..."
                />
                <button onClick={saveNote} className="mt-3 flex w-full items-center justify-center gap-2 bg-brass px-3 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-black">
                  <Save size={15} />
                  Salva nota
                </button>
              </div>
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
  const [mapError, setMapError] = useState("");
  const rawApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const apiKey = rawApiKey && rawApiKey !== "none" && rawApiKey.length > 20 ? rawApiKey : "";

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
    script.onerror = () => setMapError("Google Maps non ha caricato la libreria. Controlla key, billing e domini autorizzati.");
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
    const info = new window.google.maps.InfoWindow();
    places.forEach((place, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: place.latitude, lng: place.longitude },
        map,
        title: place.title,
        label: `${index + 1}`
      });
      marker.addListener("click", () => {
        info.setContent(`<strong>${place.title}</strong><br/><span>${place.subtitle ?? "Luogo del fascicolo"}</span>`);
        info.open({ map, anchor: marker });
        onSelect(place.id);
      });
    });
  }, [dossier.city.latitude, dossier.city.longitude, googleReady, onSelect, places]);

  const bounds = useMemo(() => {
    const lats = places.map((place) => place.latitude ?? dossier.city.latitude);
    const lngs = places.map((place) => place.longitude ?? dossier.city.longitude);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
  }, [dossier.city.latitude, dossier.city.longitude, places]);

  if (apiKey && !mapError) {
    return <div ref={mapRef} className="min-h-[620px] w-full bg-archive-850" />;
  }

  return (
    <div className="map-grid relative min-h-[620px] overflow-hidden bg-[url('/brand/citycase-brand-board.png')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,162,74,0.16),transparent_34rem)]" />
      <div className="absolute left-6 top-6 z-10 border border-white/15 bg-black/60 p-4 shadow-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-brass">Atlante di Forlì</p>
        <p className="mt-2 max-w-xs text-xs leading-5 text-archive-500">
          {mapError || "Google Maps non è attivo: inserisci una vera NEXT_PUBLIC_GOOGLE_MAPS_API_KEY e redeploya."}
        </p>
      </div>
      {places.map((place, index) => {
        const x = normalize(place.longitude ?? dossier.city.longitude, bounds.minLng, bounds.maxLng);
        const y = normalize(place.latitude ?? dossier.city.latitude, bounds.minLat, bounds.maxLat);
        return (
          <button
            key={place.id}
            onClick={() => onSelect(place.id)}
            className={`absolute z-10 max-w-48 -translate-x-1/2 -translate-y-1/2 border px-4 py-3 text-left text-xs shadow-panel ${
              selected?.id === place.id ? "border-brass bg-brass text-black" : "border-white/15 bg-black/75 text-ink"
            }`}
            style={{ left: `${10 + x * 80}%`, top: `${90 - y * 80}%` }}
          >
            <span className="mb-2 grid h-8 w-8 place-items-center rounded-full border border-current text-sm font-semibold">{index + 1}</span>
            <span className="font-semibold uppercase tracking-[0.08em]">{place.title}</span>
            <span className="mt-1 block text-[11px] opacity-75">{place.documents.length} indizi trovati</span>
          </button>
        );
      })}
    </div>
  );
}

function StreetViewPanel({ node, compactImage = false }: { node: NodeItem; compactImage?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const rawApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const apiKey = rawApiKey && rawApiKey !== "none" && rawApiKey.length > 20 ? rawApiKey : "";

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

  if (!apiKey) {
    return (
      <div className={`${compactImage ? "h-44 border-y" : "border"} border-white/10 bg-black/30 p-3 text-sm text-archive-500`}>
        Street View richiede una vera `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` e un redeploy.
      </div>
    );
  }

  return (
    <div className={`relative ${compactImage ? "h-48 border-y" : "h-52 border"} overflow-hidden border-white/10 bg-black/20`}>
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

function NavIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="hidden min-w-16 text-center text-xs uppercase tracking-[0.12em] text-ink/80 md:block">
      <div className="mb-1 grid place-items-center text-ink">{icon}</div>
      {label}
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
