"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Box,
  ClipboardList,
  Crosshair,
  FileSearch,
  FileText,
  Home,
  MapPinned,
  MessageSquareText,
  Plus,
  Radar,
  Save,
  Search,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import type { WorkspaceCase } from "@/lib/case-data";

type NodeItem = WorkspaceCase["nodes"][number];
type CaseConnection = WorkspaceCase["connections"][number];
type UserConnection = WorkspaceCase["userConnections"][number];
type WorkspaceView = "desk" | "diary" | "board" | "atlas";
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

const viewLabels: Record<WorkspaceView, string> = {
  desk: "Scrivania",
  diary: "Diario",
  board: "Lavagna",
  atlas: "Atlante"
};

export function InvestigationWorkspace({ dossier, mapsApiKey = "" }: { dossier: WorkspaceCase; mapsApiKey?: string }) {
  const displayName = dossier.user?.displayName || dossier.user?.email?.split("@")[0] || dossier.user?.nickname || "Analista";
  const firstPlace = dossier.nodes.find((node) => node.type === "place") ?? dossier.nodes[0];
  const [selectedId, setSelectedId] = useState(firstPlace?.id ?? "");
  const [opened, setOpened] = useState<string[]>(firstPlace ? [firstPlace.id] : []);
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(dossier.nodes.map((node) => [node.id, node.note])));
  const [connections, setConnections] = useState<UserConnection[]>(dossier.userConnections);
  const [sourceId, setSourceId] = useState(firstPlace?.id ?? dossier.nodes[0]?.id ?? "");
  const [targetId, setTargetId] = useState(dossier.nodes.find((node) => node.id !== firstPlace?.id)?.id ?? dossier.nodes[0]?.id ?? "");
  const [label, setLabel] = useState("potrebbe spiegare");
  const [liveHits, setLiveHits] = useState<LiveHit[]>([]);
  const [liveStatus, setLiveStatus] = useState("Non verificato");
  const [introVisible, setIntroVisible] = useState(false);
  const [archivistMessage, setArchivistMessage] = useState("Cominciamo dal luogo del delitto.");
  const [view, setView] = useState<WorkspaceView>("desk");
  const [query, setQuery] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState(dossier.questions[0]?.id ?? "");

  const selected = dossier.nodes.find((node) => node.id === selectedId) ?? firstPlace;
  const places = dossier.nodes.filter((node) => node.type === "place" && node.latitude && node.longitude);
  const discovered = dossier.nodes.filter((node) => node.discovered);
  const timeline = dossier.nodes.filter((node) => node.type === "event" || node.dateLabel).sort((a, b) => a.order - b.order);
  const openedNodes = opened.map((id) => dossier.nodes.find((node) => node.id === id)).filter(Boolean) as NodeItem[];
  const selectedConnections = selected
    ? dossier.connections.filter((connection) => connection.sourceId === selected.id || connection.targetId === selected.id)
    : [];
  const searchResults = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    return dossier.nodes.filter((node) => {
      const haystack = [node.title, node.subtitle, node.description, node.address, node.type, ...node.documents.map((document) => `${document.title} ${document.content}`)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(value);
    });
  }, [dossier.nodes, query]);
  const noteEntries = dossier.nodes
    .map((node) => ({ node, body: notes[node.id]?.trim() ?? "" }))
    .filter((item) => item.body.length > 0);

  useEffect(() => {
    const key = `citycase-intro-${dossier.id}`;
    if (!window.localStorage.getItem(key)) {
      setIntroVisible(true);
    }
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView === "diary" || requestedView === "board" || requestedView === "atlas" || requestedView === "desk") {
      setView(requestedView);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dossier.id]);

  function openNode(nodeId: string, source: "map" | "list" | "timeline" | "connection" | "document" | "search" | "question" = "map") {
    const node = dossier.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    setSelectedId(nodeId);
    setOpened((current) => [nodeId, ...current.filter((id) => id !== nodeId)].slice(0, 8));
    if (source === "timeline") setArchivistMessage("La sequenza cambia il peso degli indizi.");
    else if (source === "question") setArchivistMessage("Una domanda non si risolve: si restringe.");
    else if (source === "search") setArchivistMessage("Hai trovato una traccia. Ora cerca cosa la collega.");
    else setArchivistMessage("Ogni nodo vive solo nelle sue connessioni.");
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: dossier.id, nodeId })
    }).catch(() => undefined);
  }

  function completeIntro() {
    if (firstPlace) openNode(firstPlace.id, "map");
    window.localStorage.setItem(`citycase-intro-${dossier.id}`, "done");
    setIntroVisible(false);
  }

  async function saveNote(nodeId = selected?.id ?? "") {
    if (!nodeId) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId, body: notes[nodeId] ?? "" })
    });
    setView("diary");
    setArchivistMessage("Nota salvata. Una buona ipotesi lascia sempre una traccia scritta.");
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
      setView("board");
      setArchivistMessage("Una teoria nasce quando due tracce smettono di essere isolate.");
    }
  }

  function checkLive() {
    if (!navigator.geolocation) {
      setLiveStatus("Geolocalizzazione non disponibile");
      return;
    }

    setLiveStatus("Rilevamento in corso...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const response = await fetch("/api/live-unlocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: dossier.id, latitude: position.coords.latitude, longitude: position.coords.longitude })
        });
        const payload = (await response.json()) as { unlocked: LiveHit[] };
        setLiveHits(payload.unlocked ?? []);
        setLiveStatus(payload.unlocked?.length ? `${payload.unlocked[0].distance} metri dal luogo` : "Nessun luogo nel raggio Live");
        setView("desk");
        setArchivistMessage(payload.unlocked?.length ? "Il luogo reale ha appena aggiunto un livello al fascicolo." : "La città risponde quando sei abbastanza vicino.");
      },
      () => setLiveStatus("Permesso posizione negato"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <section className="min-h-screen bg-archive-950 text-ink">
      <WorkspaceHeader
        dossier={dossier}
        displayName={displayName}
        view={view}
        setView={setView}
        query={query}
        setQuery={setQuery}
        resultCount={searchResults.length}
      />

      <div className="grid min-h-[calc(100vh-5.75rem)] grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <LeftRail
          dossier={dossier}
          nodes={discovered}
          selectedId={selected?.id}
          archivistMessage={archivistMessage}
          activeQuestionId={activeQuestionId}
          setActiveQuestionId={setActiveQuestionId}
          onSelect={(nodeId) => openNode(nodeId, "list")}
          onQuestionSelect={(questionId) => {
            setActiveQuestionId(questionId);
            setView("desk");
            const question = dossier.questions.find((item) => item.id === questionId);
            setArchivistMessage(question?.context || "Parti dai nodi con meno risposte.");
            if (firstPlace) openNode(firstPlace.id, "question");
          }}
        />

        <main className="min-w-0 overflow-visible lg:overflow-auto">
          <div className="grid min-h-[34rem] grid-rows-[minmax(27rem,58vh)_auto] border-b border-brass/15 lg:min-h-[calc(100vh-9.5rem)] lg:grid-rows-[minmax(27rem,1fr)_auto]">
            <InvestigationMap dossier={dossier} places={places} selected={selected} onSelect={(nodeId) => openNode(nodeId, "map")} mapsApiKey={mapsApiKey} />
            <TimelineStrip items={timeline} selectedId={selected?.id} onSelect={(nodeId) => openNode(nodeId, "timeline")} />
          </div>

          <WorkspaceTools
            view={view}
            setView={setView}
            dossier={dossier}
            selected={selected}
            query={query}
            searchResults={searchResults}
            noteEntries={noteEntries}
            notes={notes}
            setNotes={setNotes}
            officialConnections={selectedConnections}
            userConnections={connections}
            sourceId={sourceId}
            setSourceId={setSourceId}
            targetId={targetId}
            setTargetId={setTargetId}
            label={label}
            setLabel={setLabel}
            liveHits={liveHits}
            liveStatus={liveStatus}
            mapsApiKey={mapsApiKey}
            onSaveNote={saveNote}
            onCreateConnection={createConnection}
            onCheckLive={checkLive}
            onSelect={(nodeId) => openNode(nodeId, "connection")}
            onSearchSelect={(nodeId) => openNode(nodeId, "search")}
          />
        </main>

        <TabDock nodes={openedNodes} activeId={selected?.id} onSelect={(nodeId) => openNode(nodeId, "list")} />
      </div>

      {introVisible && firstPlace ? <OnboardingOverlay node={firstPlace} onBegin={completeIntro} /> : null}
    </section>
  );
}

function WorkspaceHeader({
  dossier,
  displayName,
  view,
  setView,
  query,
  setQuery,
  resultCount
}: {
  dossier: WorkspaceCase;
  displayName: string;
  view: WorkspaceView;
  setView: (view: WorkspaceView) => void;
  query: string;
  setQuery: (value: string) => void;
  resultCount: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-brass/20 bg-black/85 backdrop-blur-xl">
      <div className="grid min-h-[5.75rem] gap-4 px-4 py-4 lg:grid-cols-[18rem_minmax(0,1fr)_auto] lg:px-5">
        <div className="flex items-center gap-3">
          <img src="/brand/citycase-logo-symbol.png" alt="CityCase Nodo Intrecciato" className="h-12 w-12 border border-brass/30 object-cover" />
          <div>
            <p className="text-2xl font-semibold tracking-wide">CITYCASE</p>
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-ink/65">Archivio investigativo</p>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 border-l border-brass/35 pl-5">
            <p className="text-xs uppercase tracking-[0.26em] text-brass">Fascicolo {dossier.caseNumber}</p>
            <h2 className="truncate text-xl font-semibold uppercase tracking-[0.04em] lg:text-2xl">{dossier.title}</h2>
            <p className="text-xs uppercase tracking-[0.26em] text-ink/55">{dossier.city.name}, {dossier.year}</p>
          </div>
          <label className="flex min-h-11 items-center gap-2 border border-white/10 bg-white/[0.035] px-3 text-sm text-archive-500 focus-within:border-brass/60">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setView("desk")}
              placeholder="Cerca nodi, fonti, luoghi"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
            {query ? <span className="text-xs text-brass">{resultCount}</span> : null}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <NavIcon active={view === "desk"} icon={<Home size={18} />} label="Scrivania" onClick={() => setView("desk")} />
          <NavIcon active={view === "diary"} icon={<ClipboardList size={18} />} label="Diario" onClick={() => setView("diary")} />
          <NavIcon active={view === "board"} icon={<FileSearch size={18} />} label="Lavagna" onClick={() => setView("board")} />
          <NavIcon active={view === "atlas"} icon={<Box size={18} />} label="Atlante" onClick={() => setView("atlas")} />
          <div className="ml-auto flex items-center gap-3 border-l border-white/10 pl-3 lg:ml-2">
            <div className="node-glyph active grid h-10 w-10 place-items-center text-brass">
              <UserRound size={17} />
            </div>
            <div>
              <p className="max-w-28 truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs text-archive-500">Analista</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function LeftRail({
  dossier,
  nodes,
  selectedId,
  archivistMessage,
  activeQuestionId,
  setActiveQuestionId,
  onSelect,
  onQuestionSelect
}: {
  dossier: WorkspaceCase;
  nodes: NodeItem[];
  selectedId?: string;
  archivistMessage: string;
  activeQuestionId: string;
  setActiveQuestionId: (id: string) => void;
  onSelect: (nodeId: string) => void;
  onQuestionSelect: (questionId: string) => void;
}) {
  const lastNodes = nodes.slice(0, 5);

  return (
    <aside className="border-b border-brass/15 bg-black/52 px-4 py-5 lg:sticky lg:top-[5.75rem] lg:h-[calc(100vh-5.75rem)] lg:overflow-auto lg:border-b-0 lg:border-r lg:px-5">
      <PanelTitle title="Progressione" />
      <div className="flex items-center gap-4">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full border-[8px] border-archive-800 bg-black/30 lg:h-28 lg:w-28">
          <div className="absolute inset-[-8px] rounded-full border-[8px] border-brass/70" style={{ clipPath: `inset(${100 - dossier.progressPercent}% 0 0 0)` }} />
          <span className="text-2xl font-semibold text-brass">{dossier.progressPercent}%</span>
        </div>
        <div className="text-sm text-archive-500">
          <p className="text-ink">Indagine aperta</p>
          <p>{nodes.length} nodi scoperti</p>
          <p>{dossier.documents.length} fonti disponibili</p>
        </div>
      </div>

      <div className="mt-5 border border-brass/20 bg-brass/5 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-ledger">L'Archivista</p>
        <p className="mt-2 text-sm leading-6 text-ink/80">{archivistMessage}</p>
      </div>

      <PanelTitle title="Domande investigative" className="mt-6" />
      <div className="grid gap-3">
        {dossier.questions.map((question) => {
          const active = activeQuestionId === question.id;
          return (
            <button
              key={question.id}
              onClick={() => {
                setActiveQuestionId(question.id);
                onQuestionSelect(question.id);
              }}
              className={`group border p-3 text-left transition ${active ? "border-brass/70 bg-brass/10" : "border-white/10 bg-white/[0.025] hover:border-brass/50"}`}
            >
              <div className="flex items-start gap-3">
                <span className={`node-glyph ${active ? "active" : "discovered"} mt-0.5 grid h-7 w-7 shrink-0 place-items-center text-xs`}>?</span>
                <div>
                  <p className="text-sm font-medium leading-5">{question.text}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-archive-500">{question.context}</p>
                  <div className="mt-3 h-1 bg-white/10">
                    <div className="h-full bg-brass transition-all group-hover:shadow-[0_0_18px_rgba(200,162,74,0.6)]" style={{ width: `${Math.min(88, 20 + question.order * 17 + dossier.progressPercent / 3)}%` }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <PanelTitle title="Nodi scoperti" className="mt-6" />
      <div className="grid max-h-[24rem] gap-2 overflow-auto pr-1 lg:max-h-none">
        {nodes.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelect(node.id)}
            className={`group flex items-center gap-3 border px-3 py-2 text-left text-sm transition ${
              node.id === selectedId ? "border-brass/70 bg-brass/10 text-brass" : "border-white/10 bg-archive-900/70 hover:border-white/25"
            }`}
          >
            <span className={`node-glyph ${node.id === selectedId ? "active" : "discovered"} grid h-7 w-7 shrink-0 place-items-center`}>
              {nodeIcons[node.type]}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{node.title}</span>
              <span className="block truncate text-xs text-archive-500">{node.type}</span>
            </span>
          </button>
        ))}
      </div>

      <PanelTitle title="Ultime attività" className="mt-6" />
      <div className="grid gap-2 pb-4">
        {lastNodes.map((node) => (
          <button key={node.id} onClick={() => onSelect(node.id)} className="flex items-center gap-2 text-left text-xs text-archive-500 hover:text-ink">
            <Sparkles size={13} className="text-brass" />
            {node.title}
          </button>
        ))}
      </div>
    </aside>
  );
}

function InvestigationMap({
  dossier,
  places,
  selected,
  onSelect,
  mapsApiKey
}: {
  dossier: WorkspaceCase;
  places: NodeItem[];
  selected?: NodeItem;
  onSelect: (nodeId: string) => void;
  mapsApiKey: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const rawApiKey = mapsApiKey.trim();
  const apiKey = rawApiKey && rawApiKey !== "none" && rawApiKey.length > 20 ? rawApiKey : "";

  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) {
      setGoogleReady(true);
      return;
    }
    window.initCityCaseMap = () => setGoogleReady(true);
    const existing = document.querySelector<HTMLScriptElement>("script[data-citycase-map='true']");
    if (existing) return;
    const script = document.createElement("script");
    script.dataset.citycaseMap = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initCityCaseMap`;
    script.async = true;
    script.onerror = () => setMapError("Maps non disponibile. Controlla key, billing e referrer.");
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!googleReady || !mapRef.current || !window.google?.maps) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: dossier.city.latitude, lng: dossier.city.longitude },
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#11151b" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#d9ded8" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0b0d10" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#202832" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] }
      ]
    });

    class PlaceCardOverlay extends window.google.maps.OverlayView {
      private div?: HTMLButtonElement;
      private place: NodeItem;
      private index: number;
      private active: boolean;
      private handleSelect: (nodeId: string) => void;

      constructor(place: NodeItem, index: number, active: boolean, handleSelect: (nodeId: string) => void) {
        super();
        this.place = place;
        this.index = index;
        this.active = active;
        this.handleSelect = handleSelect;
      }

      onAdd() {
        this.div = document.createElement("button");
        this.div.type = "button";
        this.div.className = `citycase-map-card ${this.active ? "is-active" : ""}`;
        this.div.innerHTML = `
          <span class="citycase-card-node">${this.index}</span>
          <span class="citycase-card-title">${this.place.title}</span>
          <span class="citycase-card-meta">${this.place.dateLabel ?? dossier.year} · ${this.place.documents.length} indizi</span>
        `;
        this.div.addEventListener("click", () => this.handleSelect(this.place.id));
        this.getPanes()?.overlayMouseTarget.appendChild(this.div);
      }

      draw() {
        if (!this.div || !this.place.latitude || !this.place.longitude) return;
        const projection = this.getProjection();
        const point = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(this.place.latitude, this.place.longitude));
        if (!point) return;
        this.div.style.left = `${point.x}px`;
        this.div.style.top = `${point.y}px`;
      }

      onRemove() {
        this.div?.remove();
      }
    }

    const overlays = places.map((place, index) => new PlaceCardOverlay(place, index + 1, selected?.id === place.id, onSelect));
    overlays.forEach((overlay) => overlay.setMap(map));
    return () => overlays.forEach((overlay) => overlay.setMap(null));
  }, [dossier.city.latitude, dossier.city.longitude, dossier.year, googleReady, onSelect, places, selected?.id]);

  const bounds = useMemo(() => {
    const lats = places.map((place) => place.latitude ?? dossier.city.latitude);
    const lngs = places.map((place) => place.longitude ?? dossier.city.longitude);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
  }, [dossier.city.latitude, dossier.city.longitude, places]);

  if (apiKey && !mapError) {
    return (
      <section className="relative min-h-[27rem] bg-archive-900">
        <div ref={mapRef} className="h-full min-h-[27rem] w-full" />
        <MapHud city={dossier.city.name} error={mapError} liveEnabled={Boolean(apiKey)} />
      </section>
    );
  }

  return (
    <section className="map-grid relative min-h-[27rem] overflow-hidden bg-[url('/brand/citycase-brand-board.png')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/78" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,162,74,0.16),transparent_34rem)]" />
      <MapHud city={dossier.city.name} error={mapError || "Inserisci una vera NEXT_PUBLIC_GOOGLE_MAPS_API_KEY e redeploya."} liveEnabled={false} />
      {places.map((place, index) => {
        const x = normalize(place.longitude ?? dossier.city.longitude, bounds.minLng, bounds.maxLng);
        const y = normalize(place.latitude ?? dossier.city.latitude, bounds.minLat, bounds.maxLat);
        return (
          <PlaceCard
            key={place.id}
            place={place}
            index={index + 1}
            active={selected?.id === place.id}
            style={{ left: `${10 + x * 80}%`, top: `${90 - y * 80}%` }}
            onClick={() => onSelect(place.id)}
          />
        );
      })}
    </section>
  );
}

function WorkspaceTools(props: {
  view: WorkspaceView;
  setView: (view: WorkspaceView) => void;
  dossier: WorkspaceCase;
  selected?: NodeItem;
  query: string;
  searchResults: NodeItem[];
  noteEntries: { node: NodeItem; body: string }[];
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  officialConnections: CaseConnection[];
  userConnections: UserConnection[];
  sourceId: string;
  setSourceId: (id: string) => void;
  targetId: string;
  setTargetId: (id: string) => void;
  label: string;
  setLabel: (label: string) => void;
  liveHits: LiveHit[];
  liveStatus: string;
  mapsApiKey: string;
  onSaveNote: (nodeId?: string) => void;
  onCreateConnection: () => void;
  onCheckLive: () => void;
  onSelect: (nodeId: string) => void;
  onSearchSelect: (nodeId: string) => void;
}) {
  return (
    <section className="border-t border-brass/15 bg-archive-950">
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 bg-black/50 px-4 pt-3 lg:hidden">
        {(Object.keys(viewLabels) as WorkspaceView[]).map((view) => (
          <button
            key={view}
            onClick={() => props.setView(view)}
            className={`min-w-28 border-x border-t px-3 py-2 text-xs uppercase tracking-[0.14em] ${props.view === view ? "border-brass/50 bg-archive-900 text-brass" : "border-white/10 bg-black/40 text-archive-500"}`}
          >
            {viewLabels[view]}
          </button>
        ))}
      </div>
      <div className="p-4 lg:p-6">
        {props.query.trim() ? (
          <SearchPanel query={props.query} results={props.searchResults} onSelect={props.onSearchSelect} />
        ) : null}
        {props.view === "desk" ? <DeskPanel {...props} /> : null}
        {props.view === "diary" ? <DiaryPanel {...props} /> : null}
        {props.view === "board" ? <BoardPanel {...props} /> : null}
        {props.view === "atlas" ? <AtlasPanel dossier={props.dossier} onSelect={props.onSelect} /> : null}
      </div>
    </section>
  );
}

function DeskPanel({
  selected,
  dossier,
  notes,
  setNotes,
  officialConnections,
  liveHits,
  liveStatus,
  mapsApiKey,
  onSaveNote,
  onCheckLive,
  onSelect
}: {
  selected?: NodeItem;
  dossier: WorkspaceCase;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  officialConnections: CaseConnection[];
  liveHits: LiveHit[];
  liveStatus: string;
  mapsApiKey: string;
  onSaveNote: (nodeId?: string) => void;
  onCheckLive: () => void;
  onSelect: (nodeId: string) => void;
}) {
  if (!selected) return null;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
      <div className="grid gap-5">
        <NodeBrief selected={selected} />
        {selected.type === "place" && selected.latitude && selected.longitude ? <StreetViewPanel node={selected} mapsApiKey={mapsApiKey} /> : null}
        <DocumentShelf selected={selected} />
      </div>
      <div className="grid content-start gap-5">
        <QuestionCue dossier={dossier} selected={selected} />
        <ConnectionList selected={selected} connections={officialConnections} nodes={dossier.nodes} onSelect={onSelect} />
        <NotesCard selected={selected} notes={notes} setNotes={setNotes} onSaveNote={onSaveNote} />
        <LivePanel liveHits={liveHits} liveStatus={liveStatus} onCheckLive={onCheckLive} />
      </div>
    </div>
  );
}

function DiaryPanel({
  selected,
  noteEntries,
  notes,
  setNotes,
  onSaveNote,
  onSelect
}: {
  selected?: NodeItem;
  noteEntries: { node: NodeItem; body: string }[];
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveNote: (nodeId?: string) => void;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div>
        <PanelTitle title="Diario dell'indagine" />
        <div className="grid gap-3">
          {noteEntries.length ? noteEntries.map(({ node, body }) => (
            <button key={node.id} onClick={() => onSelect(node.id)} className="border border-white/10 bg-black/35 p-4 text-left transition hover:border-brass/50">
              <p className="text-xs uppercase tracking-[0.2em] text-brass">{node.type}</p>
              <h4 className="mt-2 text-lg font-semibold">{node.title}</h4>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-archive-500">{body}</p>
            </button>
          )) : <EmptyState title="Nessuna nota salvata" body="Apri un nodo e scrivi la prima osservazione. Il diario prende forma mentre indaghi." />}
        </div>
      </div>
      {selected ? <NotesCard selected={selected} notes={notes} setNotes={setNotes} onSaveNote={onSaveNote} /> : null}
    </div>
  );
}

function BoardPanel({
  selected,
  dossier,
  officialConnections,
  userConnections,
  sourceId,
  setSourceId,
  targetId,
  setTargetId,
  label,
  setLabel,
  onCreateConnection,
  onSelect
}: {
  selected?: NodeItem;
  dossier: WorkspaceCase;
  officialConnections: CaseConnection[];
  userConnections: UserConnection[];
  sourceId: string;
  setSourceId: (id: string) => void;
  targetId: string;
  setTargetId: (id: string) => void;
  label: string;
  setLabel: (label: string) => void;
  onCreateConnection: () => void;
  onSelect: (nodeId: string) => void;
}) {
  if (!selected) return null;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="relative min-h-[32rem] overflow-hidden border border-white/10 bg-[url('/brand/citycase-evidence-board.jpg')] bg-cover bg-center p-5">
        <div className="absolute inset-0 bg-black/68" />
        <svg className="absolute inset-0 h-full w-full opacity-70" aria-hidden>
          {officialConnections.map((_, index) => (
            <line key={index} x1="50%" y1="20%" x2={`${20 + (index % 4) * 20}%`} y2={`${48 + Math.floor(index / 4) * 18}%`} stroke="#9b2f2f" strokeWidth="2" />
          ))}
        </svg>
        <div className="relative z-10 mx-auto max-w-sm">
          <GraphNode node={selected} active />
        </div>
        <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {officialConnections.map((connection) => {
            const otherId = connection.sourceId === selected.id ? connection.targetId : connection.sourceId;
            const other = dossier.nodes.find((node) => node.id === otherId);
            if (!other) return null;
            return (
              <button key={connection.id} onClick={() => onSelect(other.id)} className="text-left">
                <p className="mb-2 text-center text-xs uppercase tracking-[0.18em] text-rust">{connection.label}</p>
                <GraphNode node={other} />
              </button>
            );
          })}
          {!officialConnections.length ? <EmptyState title="Nessun filo ufficiale" body="Apri altri nodi o crea una connessione personale." /> : null}
        </div>
      </div>
      <ConnectionComposer
        nodes={dossier.nodes}
        sourceId={sourceId}
        setSourceId={setSourceId}
        targetId={targetId}
        setTargetId={setTargetId}
        label={label}
        setLabel={setLabel}
        onCreateConnection={onCreateConnection}
        userConnections={userConnections}
      />
    </div>
  );
}

function AtlasPanel({ dossier, onSelect }: { dossier: WorkspaceCase; onSelect: (nodeId: string) => void }) {
  const groups = [
    { label: "Luoghi", nodes: dossier.nodes.filter((node) => node.type === "place") },
    { label: "Persone", nodes: dossier.nodes.filter((node) => node.type === "person") },
    { label: "Documenti", nodes: dossier.nodes.filter((node) => node.type === "document") },
    { label: "Eventi", nodes: dossier.nodes.filter((node) => node.type === "event") }
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-4">
      {groups.map((group) => (
        <section key={group.label} className="border border-white/10 bg-black/30 p-4">
          <PanelTitle title={group.label} />
          <div className="grid gap-2">
            {group.nodes.map((node) => (
              <button key={node.id} onClick={() => onSelect(node.id)} className="flex items-center gap-3 border border-white/10 bg-white/[0.025] p-3 text-left text-sm hover:border-brass/50">
                <span className="node-glyph discovered grid h-8 w-8 shrink-0 place-items-center">{nodeIcons[node.type]}</span>
                <span>
                  <span className="block font-medium">{node.title}</span>
                  <span className="line-clamp-1 text-xs text-archive-500">{node.subtitle || node.address}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SearchPanel({ query, results, onSelect }: { query: string; results: NodeItem[]; onSelect: (nodeId: string) => void }) {
  return (
    <section className="mb-5 border border-brass/25 bg-brass/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <PanelTitle title={`Ricerca: ${query}`} />
        <p className="text-xs text-archive-500">{results.length} risultati</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {results.map((node) => (
          <button key={node.id} onClick={() => onSelect(node.id)} className="flex items-center gap-3 border border-white/10 bg-black/35 p-3 text-left hover:border-brass/50">
            <span className="node-glyph active grid h-8 w-8 shrink-0 place-items-center">{nodeIcons[node.type]}</span>
            <span>
              <span className="block text-sm font-medium">{node.title}</span>
              <span className="line-clamp-1 text-xs text-archive-500">{node.description}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function NodeBrief({ selected }: { selected: NodeItem }) {
  return (
    <section className="border border-brass/20 bg-black/35 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-ledger">{selected.type}</p>
      <h3 className="mt-2 text-3xl font-semibold uppercase tracking-[0.04em] text-brass lg:text-4xl">{selected.title}</h3>
      <p className="mt-1 text-sm text-archive-500">{selected.subtitle}</p>
      <p className="mt-5 max-w-4xl text-sm leading-7 text-archive-500">{selected.description}</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Metric value={selected.documents.length} label="fonti" />
        <Metric value={selected.liveUnlocks.length} label="live" />
        <Metric value={selected.dateLabel ? 1 : 0} label="eventi" />
      </div>
    </section>
  );
}

function QuestionCue({ dossier, selected }: { dossier: WorkspaceCase; selected: NodeItem }) {
  return (
    <section className="border border-white/10 bg-white/[0.025] p-4">
      <PanelTitle title="Cosa fare adesso" />
      <div className="grid gap-2 text-sm text-archive-500">
        <p>1. Apri almeno una fonte collegata a {selected.title}.</p>
        <p>2. Scrivi una nota nel Diario.</p>
        <p>3. Crea un filo in Lavagna con un altro nodo.</p>
        <p>4. Torna alla domanda: {dossier.questions[0]?.text}</p>
      </div>
    </section>
  );
}

function DocumentShelf({ selected }: { selected: NodeItem }) {
  if (!selected.documents.length) {
    return <EmptyState title="Nessun reperto collegato" body="Prova un altro nodo o usa Cerca per trovare fonti nel fascicolo." />;
  }

  return (
    <section>
      <PanelTitle title="Reperti collegati" />
      <div className="grid gap-4 md:grid-cols-2">
        {selected.documents.map((document) => (
          <article key={document.id} className="document-relic p-5 text-archive-950">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-rust">{document.kind}</p>
            <h4 className="mt-2 text-xl font-semibold text-archive-950">{document.title}</h4>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-archive-700">{document.sourceLabel} · {document.dateLabel}</p>
            <p className="mt-4 line-clamp-5 text-sm leading-6">{document.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConnectionList({
  selected,
  connections,
  nodes,
  onSelect
}: {
  selected: NodeItem;
  connections: CaseConnection[];
  nodes: NodeItem[];
  onSelect: (nodeId: string) => void;
}) {
  return (
    <section className="border border-white/10 bg-black/30 p-4">
      <PanelTitle title="Fili ufficiali" />
      <div className="grid gap-3">
        {connections.map((connection) => {
          const otherId = connection.sourceId === selected.id ? connection.targetId : connection.sourceId;
          const other = nodes.find((node) => node.id === otherId);
          if (!other) return null;
          return (
            <button key={connection.id} onClick={() => onSelect(other.id)} className="border border-white/10 bg-white/[0.025] p-3 text-left hover:border-brass/50">
              <p className="text-xs uppercase tracking-[0.18em] text-brass">{connection.label}</p>
              <p className="mt-1 text-sm font-medium">{other.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-archive-500">{connection.description}</p>
            </button>
          );
        })}
        {!connections.length ? <p className="text-sm text-archive-500">Nessuna connessione immediata. Usa Lavagna per crearne una.</p> : null}
      </div>
    </section>
  );
}

function NotesCard({
  selected,
  notes,
  setNotes,
  onSaveNote
}: {
  selected: NodeItem;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveNote: (nodeId?: string) => void;
}) {
  return (
    <section className="border border-white/10 bg-black/30 p-4">
      <PanelTitle title={`Nota su ${selected.title}`} />
      <textarea
        value={notes[selected.id] ?? ""}
        onChange={(event) => setNotes((current) => ({ ...current, [selected.id]: event.target.value }))}
        className="h-44 w-full resize-none border border-white/10 bg-black/30 p-4 text-sm leading-6 outline-none focus:border-brass/60"
        placeholder="Annota solo ciò che cambia la ricostruzione..."
      />
      <button onClick={() => onSaveNote(selected.id)} className="mt-3 flex w-full items-center justify-center gap-2 bg-brass px-3 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-black">
        <Save size={15} />
        Salva nel diario
      </button>
    </section>
  );
}

function ConnectionComposer({
  nodes,
  sourceId,
  setSourceId,
  targetId,
  setTargetId,
  label,
  setLabel,
  onCreateConnection,
  userConnections
}: {
  nodes: NodeItem[];
  sourceId: string;
  setSourceId: (id: string) => void;
  targetId: string;
  setTargetId: (id: string) => void;
  label: string;
  setLabel: (label: string) => void;
  onCreateConnection: () => void;
  userConnections: UserConnection[];
}) {
  return (
    <section className="border border-white/10 bg-black/30 p-4">
      <PanelTitle title="Crea un filo" />
      <div className="grid gap-2">
        <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="border border-white/10 bg-black/30 px-3 py-3 text-sm">
          {nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
        </select>
        <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="border border-white/10 bg-black/30 px-3 py-3 text-sm">
          {nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
        </select>
        <div className="flex gap-2">
          <input value={label} onChange={(event) => setLabel(event.target.value)} className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-3 text-sm" />
          <button onClick={onCreateConnection} className="grid h-12 w-12 place-items-center border border-brass/50 text-brass" title="Crea connessione">
            <Plus size={16} />
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-archive-500">{userConnections.length} connessioni personali nel fascicolo.</p>
    </section>
  );
}

function LivePanel({ liveHits, liveStatus, onCheckLive }: { liveHits: LiveHit[]; liveStatus: string; onCheckLive: () => void }) {
  return (
    <section className="border border-ledger/25 bg-ledger/5 p-4">
      <PanelTitle title="Modalità Live" />
      <button onClick={onCheckLive} className="flex w-full items-center justify-center gap-2 border border-ledger/40 bg-ledger/10 px-3 py-3 text-sm text-ledger">
        <Crosshair size={15} />
        Verifica posizione
      </button>
      <p className="mt-3 text-sm text-archive-500">{liveStatus}</p>
      <div className="mt-4 grid gap-3">
        {liveHits.map((hit) => (
          <div key={hit.id} className="border border-brass/40 bg-brass/10 p-3 text-sm leading-6 text-ink">
            <p className="font-medium text-brass">{hit.title}</p>
            <p className="mt-1">{hit.unlockedContent}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StreetViewPanel({ node, mapsApiKey = "" }: { node: NodeItem; mapsApiKey?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const rawApiKey = mapsApiKey.trim();
  const apiKey = rawApiKey && rawApiKey !== "none" && rawApiKey.length > 20 ? rawApiKey : "";

  useEffect(() => {
    setReady(false);
    if (!apiKey) return;
    const timer = window.setInterval(() => {
      if (window.google?.maps && ref.current && node.latitude && node.longitude) {
        new window.google.maps.StreetViewPanorama(ref.current, {
          position: { lat: node.latitude, lng: node.longitude },
          pov: { heading: 165, pitch: 0 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: true
        });
        setReady(true);
        window.clearInterval(timer);
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [apiKey, node.id, node.latitude, node.longitude]);

  if (!apiKey) {
    return <div className="grid min-h-[28rem] place-items-center border border-white/10 bg-black/30 p-4 text-center text-sm text-archive-500">Street View richiede una chiave Maps attiva.</div>;
  }

  return (
    <section className="relative min-h-[28rem] overflow-hidden border border-white/10 bg-black/20 lg:min-h-[32rem]">
      {!ready ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/40 text-sm text-archive-500">
          <span className="flex items-center gap-2">
            <MapPinned size={16} />
            Apertura Street View
          </span>
        </div>
      ) : null}
      <div ref={ref} className="h-full min-h-[28rem] w-full lg:min-h-[32rem]" />
    </section>
  );
}

function MapHud({ city, error, liveEnabled }: { city: string; error: string; liveEnabled: boolean }) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] border border-white/15 bg-black/70 p-4 shadow-panel backdrop-blur lg:left-6 lg:top-6 lg:max-w-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-brass">Atlante di {city}</p>
      <p className="mt-2 text-sm leading-6 text-archive-500">{error || "La mappa è il fascicolo. Ogni nodo illumina una relazione."}</p>
      <div className="mt-3 inline-flex items-center gap-2 border border-ledger/30 px-2 py-1 text-xs text-ledger">
        <span className={`h-2 w-2 rounded-full ${liveEnabled ? "bg-ledger" : "bg-archive-500"}`} />
        Modalità Live
      </div>
    </div>
  );
}

function PlaceCard({ place, index, active, style, onClick }: { place: NodeItem; index: number; active: boolean; style: React.CSSProperties; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`absolute z-10 w-48 -translate-x-1/2 -translate-y-1/2 border p-4 text-left shadow-panel transition sm:w-56 ${
        active ? "border-brass bg-brass text-black" : "border-white/15 bg-black/80 text-ink hover:border-brass/70"
      }`}
      style={style}
    >
      <span className="node-glyph active mb-3 grid h-10 w-10 place-items-center text-sm font-semibold">{index}</span>
      <span className="block text-sm font-semibold uppercase tracking-[0.1em]">{place.title}</span>
      <span className="mt-2 block text-xs opacity-75">{place.documents.length} indizi trovati</span>
    </button>
  );
}

function TimelineStrip({ items, selectedId, onSelect }: { items: NodeItem[]; selectedId?: string; onSelect: (nodeId: string) => void }) {
  return (
    <div className="thin-scrollbar overflow-x-auto border-t border-brass/20 bg-black/70 p-4">
      <div className="flex min-w-max gap-3">
        {items.map((node, index) => (
          <button
            key={node.id}
            onClick={() => onSelect(node.id)}
            className={`w-64 border p-3 text-left transition ${
              selectedId === node.id ? "border-brass bg-brass/10" : "border-white/10 bg-white/[0.025] hover:border-white/25"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.22em] text-brass">{node.dateLabel ?? `Evento ${index + 1}`}</p>
            <p className="mt-2 text-sm font-semibold">{node.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-archive-500">{node.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TabDock({ nodes, activeId, onSelect }: { nodes: NodeItem[]; activeId?: string; onSelect: (nodeId: string) => void }) {
  return (
    <footer className="thin-scrollbar sticky bottom-0 col-span-full flex min-h-14 items-end gap-1 overflow-x-auto border-t border-brass/15 bg-black/90 px-4 pt-2">
      {nodes.map((node) => (
        <button
          key={node.id}
          onClick={() => onSelect(node.id)}
          className={`flex min-w-44 items-center gap-2 border-x border-t px-3 py-2 text-left text-xs transition ${
            node.id === activeId ? "border-brass/50 bg-archive-900 text-ink" : "border-white/10 bg-black/40 text-archive-500 hover:text-ink"
          }`}
        >
          <span className={`node-glyph ${node.id === activeId ? "active" : "discovered"} grid h-6 w-6 shrink-0 place-items-center`}>
            {nodeIcons[node.type]}
          </span>
          <span className="truncate">{node.title}</span>
        </button>
      ))}
    </footer>
  );
}

function OnboardingOverlay({ node, onBegin }: { node: NodeItem; onBegin: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/88 p-5 backdrop-blur-sm">
      <div className="max-w-xl border border-brass/30 bg-archive-950/95 p-7 text-center shadow-panel">
        <img src="/brand/citycase-logo-symbol.png" alt="" className="mx-auto h-24 w-24 border border-brass/30 object-cover" />
        <p className="mt-6 text-xs uppercase tracking-[0.28em] text-ledger">L'Archivista</p>
        <h2 className="mt-3 text-4xl font-semibold">Cominciamo dal luogo del delitto.</h2>
        <p className="mt-4 text-archive-500">{node.title} è il primo nodo utile. Aprilo, poi lascia che il fascicolo risponda.</p>
        <button onClick={onBegin} className="mt-7 bg-brass px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black">
          Apri {node.title}
        </button>
      </div>
    </div>
  );
}

function GraphNode({ node, active = false }: { node: NodeItem; active?: boolean }) {
  return (
    <div className={`mx-auto flex max-w-xs items-center gap-3 border p-3 backdrop-blur ${active ? "border-brass bg-brass/10" : "border-white/10 bg-black/70"}`}>
      <span className={`node-glyph ${active ? "active" : "discovered"} grid h-9 w-9 shrink-0 place-items-center`}>{nodeIcons[node.type]}</span>
      <div>
        <p className="text-sm font-medium">{node.title}</p>
        <p className="text-xs uppercase tracking-[0.14em] text-archive-500">{node.type}</p>
      </div>
    </div>
  );
}

function NavIcon({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`min-w-16 text-center text-xs uppercase tracking-[0.12em] transition ${active ? "text-brass" : "text-ink/75 hover:text-brass"}`}>
      <span className="mb-1 grid place-items-center">{icon}</span>
      {label}
    </button>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.025] p-3">
      <p className="text-2xl font-semibold text-brass">{value}</p>
      <p className="text-xs uppercase tracking-[0.16em] text-archive-500">{label}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-white/10 bg-black/30 p-5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-archive-500">{body}</p>
    </div>
  );
}

function PanelTitle({ title, className = "" }: { title: string; className?: string }) {
  return <h4 className={`mb-3 ${className} text-xs font-semibold uppercase tracking-[0.22em] text-brass`}>{title}</h4>;
}

function normalize(value: number, min: number, max: number) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}
