"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronRight, Crosshair, Eraser, Grid2X2, Hand, HelpCircle, Layers, MessageSquare, MapPin, Menu, Minus, MousePointer2, MoveUpRight, Pencil, Plus, Redo2, RotateCcw, Search, Square, Trash2, Undo2, X } from "lucide-react";
import { AREAS, findDetailedArea, resolveArea, type Area } from "../lib/areas";
import { displayColor, markerKey, normalizeColor, parseMarkers, serializeMarkers, toRuneLite, type Marker, type Tile } from "../lib/markers";
import { clampView } from "../lib/map-math";
import { searchAreas } from "../lib/catalogue-search";
import { groupMarkerRegions, type MarkerRegion } from "../lib/marker-groups";
import { importMarkerFile } from "../lib/profile-import";
import { getExportSelection, type ExportContext, type ExportScope } from "../lib/export-scope";
import FeedbackForm from "./FeedbackForm";
import { type FeedbackContext, type FeedbackKind } from "../lib/feedback";
import MapCanvas, { type Tool, type View } from "./MapCanvas";

const INITIAL_VIEW: View = { x: 3222, y: 3218, scale: 12, plane: 0 };
const STORAGE_KEY = "osrs-tile-studio:v1";
const PALETTE = ["#E5BD70", "#F27575", "#82CAAA", "#74B8F3", "#B9A1EB", "#F0F0ED"];
const TOOLS = [
  { id: "pan", name: "Pan", key: "H", icon: Hand },
  { id: "paint", name: "Brush", key: "B", icon: Pencil },
  { id: "line", name: "Line", key: "L", icon: MoveUpRight },
  { id: "rectangle", name: "Rectangle", key: "R", icon: Square },
  { id: "erase", name: "Eraser", key: "E", icon: Eraser },
  { id: "select", name: "Inspect", key: "V", icon: MousePointer2 },
] as const;
const CATEGORIES = ["All areas", "Towns & landmarks", "Bosses", "Raids", "Dungeons", "Instances", "Regions", "Map spaces"];
const validView = (v: unknown): v is View => {
  if (!v || typeof v !== "object") return false;
  const p = v as View;
  return Number.isFinite(p.x) && p.x >= 0 && p.x <= 16383 && Number.isFinite(p.y) && p.y >= 0 && p.y <= 16383 && Number.isFinite(p.scale) && p.scale >= .125 && p.scale <= 64 && Number.isInteger(p.plane) && p.plane >= 0 && p.plane <= 3;
};

export default function TileEditor() {
  const [view, setViewState] = useState<View>(INITIAL_VIEW);
  const setView = useCallback((next: React.SetStateAction<View>) => {
    setViewState(current => clampView(typeof next === "function" ? next(current) : next));
  }, []);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const markersRef = useRef(markers);
  const undoRef = useRef<Marker[][]>([]);
  const redoRef = useRef<Marker[][]>([]);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [name, setName] = useState("Untitled layout");
  const [tool, setTool] = useState<Tool>("paint");
  const [color, setColor] = useState("#FFE5BD70");
  const [label, setLabel] = useState("");
  const [grid, setGrid] = useState(true);
  const [hover, setHover] = useState<Tile | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All areas");
  const [sidebarTab, setSidebarTab] = useState<"explore" | "markers">("explore");
  const [sidebar, setSidebar] = useState(false);
  const [coordinates, setCoordinates] = useState({ x: "3222", y: "3218" });
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState("Saved on this device");
  const [toast, setToast] = useState("");
  const [mapStatus, setMapStatus] = useState({ loading: 0, loaded: 0, missing: 0 });
  const [mapVersion, setMapVersion] = useState(0);
  const [modal, setModal] = useState<"import" | "export" | "help" | "clear" | "feedback" | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ context: FeedbackContext; kind: FeedbackKind; area: string }>({ context: { area: "", x: 3222, y: 3218, plane: 0 }, kind: "missing-area", area: "" });
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [exportScope, setExportScope] = useState<ExportScope>("area");
  const [exportContext, setExportContext] = useState<ExportContext>({ view: INITIAL_VIEW, size: { width: 0, height: 0 } });
  const [incoming, setIncoming] = useState<{ name: string; view?: View } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initializedRef = useRef(false);
  const uploadVersionRef = useRef(0);

  const notify = useCallback((message: string) => setToast(message), []);
  const syncHistory = useCallback(() => setHistory({ undo: undoRef.current.length, redo: redoRef.current.length }), []);
  const commit = useCallback((next: Marker[]) => {
    if (next.length > 20000) { notify("A layout can contain at most 20,000 markers."); return false; }
    if (JSON.stringify(markersRef.current) === JSON.stringify(next)) return true;
    undoRef.current.push(markersRef.current);
    // Bound retained marker objects as well as gesture count for large layouts.
    while (undoRef.current.length > 60 || (undoRef.current.length > 1 && undoRef.current.reduce((sum, set) => sum + set.length, 0) > 150000)) undoRef.current.shift();
    redoRef.current = [];
    markersRef.current = next;
    setMarkers(next);
    syncHistory();
    return true;
  }, [notify, syncHistory]);
  const undo = useCallback(() => {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current.push(markersRef.current);
    markersRef.current = previous;
    setMarkers(previous);
    syncHistory();
  }, [syncHistory]);
  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(markersRef.current);
    markersRef.current = next;
    setMarkers(next);
    syncHistory();
  }, [syncHistory]);

  useEffect(() => {
    let cancelled = false;
    function openSharedLayout() {
      try {
        const params = new URLSearchParams(location.hash.slice(1));
        const encoded = params.get("tiles");
        if (!encoded) return;
        if (encoded.length > 100000) throw new Error("This shared layout is too large. Import its JSON file instead.");
        const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
        const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
        if (data.v !== 1) throw new Error("This layout uses an unsupported link format.");
        const imported = parseMarkers(JSON.stringify(data.markers));
        const sharedName = typeof data.name === "string" ? data.name.slice(0, 80) : "Shared layout";
        // Consume a valid snapshot once so refresh restores the edited local draft.
        params.delete("tiles");
        const remaining = params.toString();
        window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}${remaining ? `#${remaining}` : ""}`);
        if (markersRef.current.length) {
          setImportText(serializeMarkers(imported));
          setImportError("");
          setIncoming({ name: sharedName, view: validView(data.view) ? data.view : undefined });
          setModal("import");
        } else {
          commit(imported);
          setName(sharedName);
          if (validView(data.view)) setView(data.view);
          else if (imported[0]) setView({ ...INITIAL_VIEW, ...imported[0] });
          setSelected(null);
          setModal(null);
          notify(`Opened ${sharedName}. Your edits stay on this device.`);
        }
      } catch (error) { notify(error instanceof Error ? error.message : "That shared link could not be opened."); }
    }
    function hashChange() {
      if (initializedRef.current) openSharedLayout();
    }
    window.addEventListener("hashchange", hashChange);
    // Defer external-storage hydration and cancel StrictMode's first effect replay.
    queueMicrotask(() => {
      if (cancelled || initializedRef.current) return;
      initializedRef.current = true;
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          const restored = parseMarkers(JSON.stringify(data.markers));
          markersRef.current = restored;
          setMarkers(restored);
          if (validView(data.view)) setView(data.view);
          if (typeof data.name === "string") setName(data.name.slice(0, 80));
        }
      } catch {
        if (raw !== null) {
          try {
            localStorage.setItem(`${STORAGE_KEY}:recovery:${Date.now()}`, raw);
            notify("Your saved draft could not be loaded. Its original data is preserved in a recovery backup on this device; new edits will save normally.");
          } catch {
            setSaved("Device storage unavailable");
            notify("Your saved draft could not be loaded or backed up. Its original data has been preserved. Export new markers to keep your work.");
          }
        } else {
          setSaved("Device storage unavailable");
          notify("This browser could not open device storage. Export markers to keep a copy.");
        }
      }
      openSharedLayout();
      const destinationId = new URLSearchParams(location.search).get("area");
      const destination = AREAS.find(area => area.id === destinationId);
      if (destination) {
        setView({ x: destination.x, y: destination.y, plane: destination.plane, scale: 12 });
        setCoordinates({ x: String(destination.x), y: String(destination.y) });
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", hashChange);
    };
  }, [commit, notify, setView]);

  useEffect(() => {
    if (!ready || saved === "Device storage unavailable") return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, markers: toRuneLite(markers), view }));
        setSaved("Saved on this device");
      } catch { setSaved("Device storage unavailable"); notify("This browser could not save your draft. Export markers to keep a copy."); }
    }, 250);
    return () => clearTimeout(timer);
  }, [ready, markers, name, view, saved, notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (modal !== "import") uploadVersionRef.current++;
    if (modal && !dialogRef.current?.open) dialogRef.current?.showModal();
    else if (!modal && dialogRef.current?.open) dialogRef.current?.close();
  }, [modal]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (modal || (event.target as HTMLElement)?.closest("input, textarea, select, [contenteditable=true]")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const nextTool = TOOLS.find(t => t.key.toLowerCase() === event.key.toLowerCase());
      if (nextTool) { event.preventDefault(); setTool(nextTool.id); }
      if (event.key.toLowerCase() === "g") setGrid(g => !g);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [modal, redo, undo]);

  const areas = useMemo(() => searchAreas(AREAS, query, category), [query, category]);
  const markerRegions = useMemo(() => groupMarkerRegions(markers).map(group => {
    const areaName = resolveArea(Math.floor(group.x), Math.floor(group.y), group.plane);
    const name = ["unknown area", "Underground", "Instanced area", "Open Sea"].includes(areaName) ? `Region ${group.regionId}` : areaName;
    return { ...group, name, search: `${name} ${group.regionId} ${group.markers.map(marker => marker.label ?? "").join(" ")}`.toLowerCase() };
  }), [markers]);
  const matchingRegions = useMemo(() => {
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return markerRegions.filter(group => tokens.every(token => group.search.includes(token)));
  }, [markerRegions, query]);
  const onPlane = useMemo(() => markers.filter(m => m.plane === view.plane), [markers, view.plane]);
  const selectedMarker = useMemo(() => markers.find(m => markerKey(m) === selected), [markers, selected]);
  const currentArea = resolveArea(Math.floor(view.x), Math.floor(view.y), view.plane);
  const currentDetailedArea = findDetailedArea(Math.floor(view.x), Math.floor(view.y), view.plane);
  const currentRegion = ((Math.floor(view.x) >> 6) << 8) | (Math.floor(view.y) >> 6);
  const cursor = hover ?? { x: Math.floor(view.x), y: Math.floor(view.y) };
  const exportSelection = useMemo(() => getExportSelection(markers, exportScope, exportContext), [markers, exportScope, exportContext]);
  const exportJson = useMemo(() => serializeMarkers(exportSelection.markers), [exportSelection]);

  function goArea(area: Area) {
    setView({ x: area.x, y: area.y, plane: area.plane, scale: area.category === "Regions" || area.category === "Map spaces" ? 2 : area.category === "Towns & landmarks" ? 7 : 12 });
    setCoordinates({ x: String(area.x), y: String(area.y) });
    setSidebar(false);
  }
  function goMarkerRegion(group: MarkerRegion) {
    const [minX, minY, maxX, maxY] = group.bounds;
    const rect = document.querySelector(".map-stage")?.getBoundingClientRect();
    setView({ x: group.x, y: group.y, plane: group.plane, scale: Math.max(4, Math.min(24, ((rect?.width ?? 800) - 100) / (maxX - minX + 8), ((rect?.height ?? 600) - 130) / (maxY - minY + 8))) });
    setCoordinates({ x: String(Math.floor(group.x)), y: String(Math.floor(group.y)) });
    setSidebar(false);
  }
  function goCoordinates(event: React.FormEvent) {
    event.preventDefault();
    const x = Number(coordinates.x), y = Number(coordinates.y);
    if (!coordinates.x.trim() || !coordinates.y.trim() || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > 16383 || y > 16383) { notify("Enter whole-number X and Y coordinates between 0 and 16,383."); return; }
    setView(v => ({ ...v, x: x + .5, y: y + .5, scale: Math.max(8, v.scale) }));
    setSidebar(false);
  }
  const onStroke = useCallback((tiles: Tile[], erase: boolean) => {
    const next = new Map(markersRef.current.map(m => [markerKey(m), m]));
    for (const tile of tiles) {
      const marker: Marker = { ...tile, plane: view.plane, color, ...(label.trim() ? { label: label.trim() } : {}) };
      if (erase) next.delete(markerKey(marker));
      else next.set(markerKey(marker), marker);
    }
    commit([...next.values()]);
  }, [view.plane, color, label, commit]);
  const onSelect = useCallback((tile: Tile) => {
    const key = markerKey({ ...tile, plane: view.plane });
    setSelected(key);
    if (!markersRef.current.some(m => markerKey(m) === key)) notify(`Tile ${tile.x}, ${tile.y} has no marker. Use the brush to add one.`);
  }, [view.plane, notify]);
  function fitMarkers() {
    const list = onPlane;
    if (!list.length) { notify("No markers on this plane yet."); return; }
    const minX = Math.min(...list.map(m => m.x)), maxX = Math.max(...list.map(m => m.x));
    const minY = Math.min(...list.map(m => m.y)), maxY = Math.max(...list.map(m => m.y));
    const rect = document.querySelector(".map-stage")?.getBoundingClientRect();
    setView(v => ({ ...v, x: (minX + maxX + 1) / 2, y: (minY + maxY + 1) / 2, scale: Math.max(.125, Math.min(24, ((rect?.width ?? 800) - 120) / (maxX - minX + 8), ((rect?.height ?? 600) - 150) / (maxY - minY + 8))) }));
  }
  async function copy(text: string, success: string) {
    try { await navigator.clipboard.writeText(text); notify(success); }
    catch { notify("Clipboard access is unavailable. Select the text below and copy it manually."); }
  }
  function openExport() {
    const rect = document.querySelector(".map-stage canvas")?.getBoundingClientRect();
    setExportContext({ view: { ...view }, size: { width: rect?.width ?? 0, height: rect?.height ?? 0 }, area: currentDetailedArea });
    setExportScope("area");
    setModal("export");
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportJson], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    const exportName = exportScope === "all" ? name : exportContext.area?.name ?? `region-${((Math.floor(exportContext.view.x) >> 6) << 8) | (Math.floor(exportContext.view.y) >> 6)}`;
    anchor.download = `${exportName.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 70) || "tile-markers"}-${exportScope}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importMarkers(replace: boolean) {
    try {
      const imported = importMarkerFile(importText).markers;
      const next = replace ? imported : [...new Map([...markersRef.current, ...imported].map(m => [markerKey(m), m])).values()];
      if (!commit(next)) return;
      if (incoming?.view) setView(incoming.view);
      else if (imported[0]) setView({ x: imported[0].x + .5, y: imported[0].y + .5, plane: imported[0].plane, scale: 14 });
      if (incoming && replace) setName(incoming.name);
      setModal(null);
      setIncoming(null);
      setSidebarTab("markers");
      setTool("pan");
      setQuery("");
      notify(`Imported ${imported.length.toLocaleString()} markers. Undo is available.`);
    } catch (error) { setImportError(error instanceof Error ? error.message : "Unable to import markers."); }
  }
  function openFeedback(kind: FeedbackKind = "map-problem", area = currentArea === "unknown area" ? "" : currentArea) {
    setFeedback({ kind, area: area.slice(0, 120), context: { area: currentArea === "unknown area" ? "" : currentArea.slice(0, 120), x: Math.floor(view.x), y: Math.floor(view.y), plane: view.plane } });
    setSidebar(false); setModal("feedback");
  }
  function openImport() { uploadVersionRef.current++; setImportText(""); setImportError(""); setImportSummary(""); setIncoming(null); setModal("import"); }

  return <div className="studio">
    <header className="app-header">
      <button className="icon-button mobile-menu" aria-label="Toggle area panel" onClick={() => setSidebar(!sidebar)}><Menu size={20} /></button>
      <a className="brand" href="#" onClick={event => event.preventDefault()} aria-label="Tile Studio home"><span className="brand-mark"><Grid2X2 size={24} /></span><span>Tile<span className="brand-light">Studio</span><small>OLD SCHOOL RUNESCAPE</small></span></a>
      <div className="header-divider" />
      <div className="layout-name"><input aria-label="Layout name" value={name} maxLength={80} onChange={e => setName(e.target.value)} onBlur={() => { if (!name.trim()) setName("Untitled layout"); }} /><span><span className={`save-dot ${saved.startsWith("Saved") ? "" : "warning"}`} />{saved}</span></div>
      <div className="header-actions"><button className="button quiet" aria-label="Send feedback" onClick={() => openFeedback()}><MessageSquare size={16} /><span>Feedback</span></button><button className="button quiet" onClick={openImport}><ArrowUpFromLine size={16} /><span>Import</span></button><button className="button primary" onClick={openExport}><ArrowDownToLine size={16} /><span>Export markers</span></button></div>
    </header>
    <div className="workspace">
      {sidebar && <button className="sidebar-scrim" aria-label="Close area panel" onClick={() => setSidebar(false)} />}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <section className="explore-header"><h1>Locations</h1><p>Search areas or enter coordinates.</p></section>
        <div className="search-section">
          <div className="sidebar-tabs" role="group" aria-label="Browse areas or your markers"><button aria-pressed={sidebarTab === "explore"} className={sidebarTab === "explore" ? "active" : ""} onClick={() => { setSidebarTab("explore"); setQuery(""); }}>Areas</button><button aria-pressed={sidebarTab === "markers"} className={sidebarTab === "markers" ? "active" : ""} onClick={() => { setSidebarTab("markers"); setQuery(""); }}>Your markers <span>{markerRegions.length}</span></button></div>
          <label className="search-box"><Search size={17} /><input aria-label={sidebarTab === "explore" ? "Search areas or region IDs" : "Search your markers by location, region, or label"} placeholder={sidebarTab === "explore" ? "Search areas or region IDs…" : "Location, region, or label…"} value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button small" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</label>
          {sidebarTab === "explore" ? <label className="category-select"><span>Category</span><select aria-label="Area category" value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label> : <div className="region-summary"><span>{markers.length.toLocaleString()} markers · {new Set(markerRegions.map(group => group.regionId)).size} regions</span><button onClick={openImport} title="Import another RuneLite file"><Plus size={13} /> Import</button></div>}
        </div>
        {sidebarTab === "explore" ? <nav className="area-list" aria-label="Area destinations">{areas.map(area => <button key={area.id} className={`area-item ${(currentDetailedArea ? area.id === currentDetailedArea.id : area.regionIds ? area.regionIds.includes(currentRegion) && area.plane === view.plane : currentArea === area.name) ? "current" : ""}`} onClick={() => goArea(area)}><span className={`area-icon ${area.category === "Bosses" ? "boss-icon" : ""}`}><MapPin size={16} /></span><span className="area-copy"><strong>{area.name}</strong><small>{area.kind ? `${area.kind.charAt(0).toUpperCase()}${area.kind.slice(1)} · ` : ""}{area.category}{area.regionIds ? ` · ${area.regionIds[0]}` : ""}</small></span><ChevronRight size={14} /></button>)}{areas.length === 0 && <div className="empty-search">No mapped areas found.<br />Try a town, boss, or exact coordinates below.<button className="button compact region-import-button" onClick={() => openFeedback("missing-area", query)}><MessageSquare size={14} /> Request an area</button></div>}</nav> : <nav className="area-list" aria-label="Your marker regions">{matchingRegions.map(group => <button key={group.id} className={`area-item ${currentRegion === group.regionId && view.plane === group.plane ? "current" : ""}`} onClick={() => goMarkerRegion(group)}><span className="area-icon"><Grid2X2 size={16} /></span><span className="area-copy"><strong>{group.name}</strong><small>Region {group.regionId} · Plane {group.plane}</small><small>{group.markers.length.toLocaleString()} markers</small></span><ChevronRight size={14} /></button>)}{matchingRegions.length === 0 && <div className="empty-search">{markers.length ? "No marker regions match your search." : <>Your saved tiles will appear here, grouped by region and plane.<button className="button compact region-import-button" onClick={openImport}><ArrowUpFromLine size={14} /> Import RuneLite file</button></>}</div>}</nav>}
        <section className="coordinate-section"><div className="section-label"><Crosshair size={14} /> JUMP TO COORDINATES</div><form onSubmit={goCoordinates}><label>X<input aria-label="World X" inputMode="numeric" value={coordinates.x} onChange={e => setCoordinates(c => ({ ...c, x: e.target.value }))} /></label><label>Y<input aria-label="World Y" inputMode="numeric" value={coordinates.y} onChange={e => setCoordinates(c => ({ ...c, y: e.target.value }))} /></label><button type="submit" className="icon-button coordinate-go" aria-label="Go to coordinates"><MoveUpRight size={18} /></button></form><span className="muted-small">Uses the selected plane. Dungeons have their own X/Y.</span></section>
        <section className="sidebar-footer"><span className="small-grid"><Grid2X2 size={15} /></span><div><strong>OSRS tile marker editor</strong><span>{AREAS.length} locations · RuneLite compatible</span></div></section>
      </aside>
      <main className="editor">
        <div className="editor-heading"><div><span className="map-kicker"><span className="live-dot" /> WORLD MAP</span><h2>{currentArea === "unknown area" ? "Unknown area" : currentArea}</h2></div><button className="button compact" onClick={() => setModal("help")}><HelpCircle size={16} /><span>How to use</span></button></div>
        <div className="drawing-bar"><div className="tool-group" role="group" aria-label="Drawing tools">{TOOLS.map(({ id, name: title, key, icon: Icon }) => <button key={id} title={`${title} (${key})`} aria-label={`${title} (${key})`} aria-pressed={tool === id} className={`tool-button ${tool === id ? "active" : ""}`} onClick={() => setTool(id)}><Icon size={18} /><span>{title}</span></button>)}</div><span className="toolbar-separator" /><div className="history-group"><button className="icon-button" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!history.undo} onClick={undo}><Undo2 size={18} /></button><button className="icon-button" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!history.redo} onClick={redo}><Redo2 size={18} /></button></div><div className="toolbar-end"><button className={`icon-button ${grid ? "toggled" : ""}`} title="Toggle grid (G)" aria-label="Toggle tile grid" aria-pressed={grid} onClick={() => setGrid(!grid)}><Grid2X2 size={17} /></button></div></div>
        <div className="map-stage">
          <MapCanvas key={mapVersion} view={view} onViewChange={setView} markers={markers} tool={tool} color={color} label={label} grid={grid} onStroke={onStroke} onSelect={onSelect} onHover={setHover} onStatus={setMapStatus} onError={notify} />
          <div className="map-top-left"><div className="plane-control"><Layers size={16} /><label>Plane<select aria-label="Map plane" value={view.plane} onChange={e => { setSelected(null); setView(v => ({ ...v, plane: Number(e.target.value) })); }}><option value={0}>0 · Ground</option><option value={1}>1 · First floor</option><option value={2}>2 · Second floor</option><option value={3}>3 · Third floor</option></select></label></div>{mapStatus.loading > 0 && <span className="map-load"><span className="live-dot" /> Loading map…</span>}</div>
          <div className="compass" aria-label="North is up"><span>N</span><div>↑</div></div>
          <div className="map-zoom"><button aria-label="Zoom in" title="Zoom in (+)" onClick={() => setView(v => ({ ...v, scale: Math.min(64, v.scale * 1.5) }))}><Plus size={18} /></button><span>{Math.round(view.scale * 100 / 4)}%</span><button aria-label="Zoom out" title="Zoom out (-)" onClick={() => setView(v => ({ ...v, scale: Math.max(.125, v.scale / 1.5) }))}><Minus size={18} /></button><button aria-label="Fit markers on this plane" title="Fit markers on this plane" onClick={fitMarkers}><Crosshair size={18} /></button></div>
          {mapStatus.missing > 0 && mapStatus.loaded === 0 && mapStatus.loading === 0 && <div className="map-unavailable"><MapPin size={22} /><strong>No imagery here on plane {view.plane}</strong><span>Try another plane or location. The image host may also be unavailable.</span><button className="button compact" onClick={() => setMapVersion(v => v + 1)}><RotateCcw size={14} /> Retry images</button><button className="text-link" onClick={() => openFeedback("map-problem")}>Report missing imagery</button></div>}
          <div className="map-bottom-hint"><span>{tool === "pan" ? "Drag to pan" : tool === "select" ? "Click a marker to inspect it" : tool === "rectangle" ? "Drag to draw a rectangle outline" : tool === "line" ? "Drag to draw a straight line" : tool === "erase" ? "Drag across markers to erase" : "Click or drag to paint tiles"}</span><i /> <span><kbd>Space</kbd> + drag to pan</span><i /> <span>Scroll to zoom</span></div>
          <div className="map-attribution">Map images <a href="https://github.com/mejrs/layers_osrs" target="_blank" rel="noreferrer">Mejrs</a> · Game artwork © Jagex</div>
        </div>
        <div className="marker-panel"><div className="marker-style"><span className="section-label">MARKER STYLE</span><div className="swatches">{PALETTE.map(c => <button key={c} aria-label={`Use marker color ${c}`} aria-pressed={displayColor(color).toUpperCase() === c} onClick={() => setColor(normalizeColor(c))} className={`swatch ${displayColor(color).toUpperCase() === c ? "selected" : ""}`} style={{ "--swatch": c } as React.CSSProperties}>{displayColor(color).toUpperCase() === c && <Check size={13} />}</button>)}<label className="custom-color" title="Custom marker color"><Plus size={13} /><input aria-label="Custom marker color" type="color" value={displayColor(color)} onChange={e => setColor(normalizeColor(e.target.value))} /></label></div></div><label className="marker-label"><span className="section-label">LABEL <span className="optional">OPTIONAL</span></span><input aria-label="Label for new markers" placeholder="e.g. Stand here" value={label} maxLength={120} onChange={e => setLabel(e.target.value)} /></label><div className="marker-count"><strong>{markers.length.toLocaleString()} <span>markers</span></strong><small>{onPlane.length.toLocaleString()} on this plane</small></div><button className="icon-button clear-button" title="Clear layout" aria-label="Clear all markers" disabled={!markers.length} onClick={() => setModal("clear")}><Trash2 size={17} /></button></div>
        {selectedMarker && <section className="selected-panel"><span className="selected-dot" style={{ background: displayColor(selectedMarker.color) }} /><strong>Tile {selectedMarker.x}, {selectedMarker.y}</strong><span className="muted-small">Plane {selectedMarker.plane}</span><input aria-label="Selected marker label" value={selectedMarker.label ?? ""} maxLength={120} placeholder="Add a label" onChange={e => commit(markersRef.current.map(m => markerKey(m) === selected ? { ...m, label: e.target.value } : m))} /><input aria-label="Selected marker color" type="color" value={displayColor(selectedMarker.color)} onChange={e => commit(markersRef.current.map(m => markerKey(m) === selected ? { ...m, color: normalizeColor(`#${m.color.slice(1, 3)}${e.target.value.slice(1)}`) } : m))} /><button className="icon-button" aria-label="Delete selected marker" onClick={() => { commit(markersRef.current.filter(m => markerKey(m) !== selected)); setSelected(null); }}><Trash2 size={15} /></button><button className="icon-button" aria-label="Close marker inspector" onClick={() => setSelected(null)}><X size={15} /></button></section>}
        <footer className="status-bar"><div><Crosshair size={13} /><span>X <b>{cursor.x}</b></span><span>Y <b>{cursor.y}</b></span><span>Region <b>{((cursor.x >> 6) << 8) | (cursor.y >> 6)}</b></span><span>Plane <b>{view.plane}</b></span></div><span>{view.scale < 6 ? "Zoom in to see the tile grid" : "1 square = 1 game tile"}</span></footer>
      </main>
    </div>
    {toast && <div className="toast" role="status"><span>{toast}</span><button aria-label="Dismiss message" className="icon-button small" onClick={() => setToast("")}><X size={15} /></button></div>}
    <dialog ref={dialogRef} className="modal" onCancel={event => { if (feedbackBusy) event.preventDefault(); else setModal(null); }} onClick={e => { if (!feedbackBusy && e.target === dialogRef.current) setModal(null); }} aria-labelledby="modal-title"><div className="modal-content"><button className="modal-close icon-button" aria-label="Close dialog" disabled={feedbackBusy} onClick={() => setModal(null)}><X size={20} /></button>
      {modal === "feedback" && <FeedbackForm context={feedback.context} initialKind={feedback.kind} initialArea={feedback.area} onBusyChange={setFeedbackBusy} onClose={() => setModal(null)} />}
      {modal === "import" && <><h2 id="modal-title">{incoming ? incoming.name : "Import your RuneLite markers"}</h2><p>{incoming ? "Import this layout by adding its markers or replacing the current markers." : "Import a RuneLite profile (.properties) for all saved regions, or a Ground Markers JSON file. Colors, labels, and planes are preserved."}</p>
        <label className="file-picker">Choose RuneLite profile or JSON file<input type="file" aria-label="Choose RuneLite profile or marker JSON" accept=".properties,.json,application/json,text/plain" onChange={async e => {
          const input = e.currentTarget;
          const uploadVersion = ++uploadVersionRef.current;
          const file = input.files?.[0];
          if (!file) return;
          setImportText(""); setImportSummary(""); setImportError("");
          if (file.size > 10 * 1024 * 1024) { setImportError("Choose a profile or JSON file under 10 MB."); input.value = ""; return; }
          try {
            const text = await file.text();
            if (uploadVersion !== uploadVersionRef.current || !input.isConnected || !dialogRef.current?.open) return;
            const result = importMarkerFile(text, file.name);
            // Keep only normalized Ground Markers in state; discard profile contents.
            setImportText(serializeMarkers(result.markers));
            setImportSummary(`${result.markers.length.toLocaleString()} markers across ${result.regionCount} regions${result.format === "runelite-profile" ? " · Other profile settings ignored" : ""}`);
          } catch (error) {
            if (uploadVersion === uploadVersionRef.current && input.isConnected && dialogRef.current?.open) setImportError(error instanceof Error ? error.message : "Could not read this file.");
          }
          if (uploadVersion === uploadVersionRef.current && input.isConnected) input.value = "";
        }} /></label>
        <details className="profile-instructions"><summary>Where do I get my RuneLite profile file?</summary><p>In RuneLite, open <b>Configuration → Profiles</b>, expand your active profile, and click <b>Export profile</b>. Choose that exported file here.</p><p>On Windows, local profiles are also usually in <code>%USERPROFILE%\.runelite\profiles2</code>. Older setups may use <code>settings.properties</code>. Each profile has its own markers; import additional profiles with <b>Add to layout</b>.</p><p>A world-map globe export includes nearby regions. A full profile or the RuneLite account tile-marker export can include all saved regions.</p></details>
        {importSummary && <div className="import-summary" role="status">{importSummary}</div>}
        <textarea aria-label="RuneLite markers or profile text to import" value={importText} onChange={e => { uploadVersionRef.current++; setImportText(e.target.value); setImportError(""); setImportSummary(""); }} placeholder={'Or paste markers here: [{"regionId":12850,"regionX":22,"regionY":19,"z":0,"color":"#FFFF0000"}]'} spellCheck={false} />
        {importError && <p className="form-error" role="alert">{importError}</p>}<div className="modal-actions"><button className="button" disabled={!importText.trim()} onClick={() => importMarkers(true)}>Replace current</button><button className="button primary" disabled={!importText.trim()} onClick={() => importMarkers(false)}>Add to layout</button></div><p className="muted-small">Files stay in this browser. Only Ground Markers are imported. Both actions can be undone. Browse every imported region in <b>Your markers</b>.</p></>}
      {modal === "export" && <><h2 id="modal-title">Export markers</h2>
        <fieldset className="export-scopes"><legend>EXPORT SCOPE</legend>
          <label className={exportScope === "area" ? "selected" : ""}><input type="radio" name="export-scope" value="area" checked={exportScope === "area"} onChange={() => setExportScope("area")} /><span><strong>Current boss / area</strong><small>{exportContext.area?.name ?? `Region ${((Math.floor(exportContext.view.x) >> 6) << 8) | (Math.floor(exportContext.view.y) >> 6)}`}</small></span></label>
          <label className={exportScope === "visible" ? "selected" : ""}><input type="radio" name="export-scope" value="visible" checked={exportScope === "visible"} onChange={() => setExportScope("visible")} /><span><strong>Visible map only</strong><small>Tiles in the map view on plane {exportContext.view.plane}</small></span></label>
          <label className={exportScope === "all" ? "selected" : ""}><input type="radio" name="export-scope" value="all" checked={exportScope === "all"} onChange={() => setExportScope("all")} /><span><strong>All markers</strong><small>Entire layout, every region and plane</small></span></label>
        </fieldset>
        <div className="export-summary" role="status"><strong>{exportSelection.markers.length.toLocaleString()} of {markers.length.toLocaleString()} markers</strong><span>{exportSelection.description}</span></div>
        {exportScope === "area" && !exportContext.area?.exportBounds && <p className="muted-small">This includes all mapped regions for this area on the selected plane. Choose Visible map only to narrow it to a room or section.</p>}
        <textarea aria-label="Exported RuneLite markers" readOnly value={exportJson} onFocus={e => e.currentTarget.select()} spellCheck={false} />
        {!exportSelection.markers.length && <p className="form-error">No markers in this scope. Choose another scope or add markers to this area.</p>}
        <div className="modal-actions"><button className="button" disabled={!exportSelection.markers.length} onClick={download}><ArrowDownToLine size={16} /> Download JSON</button><button className="button primary" disabled={!exportSelection.markers.length} onClick={() => copy(exportJson, `Copied ${exportSelection.markers.length.toLocaleString()} RuneLite markers.`)}>Copy for RuneLite</button></div>
        <div className="instruction-card"><strong>Load them in RuneLite</strong><p>Enable Ground Markers, copy this export, then right-click the world map globe and choose <b>Import Ground Markers</b>. Use the matching area and plane in game.</p><p>RuneLite keeps markers already on the same tiles. To apply changed colors or labels, back up your current RuneLite markers, remove the matching markers, then import this export.</p></div></>}
      {modal === "clear" && <><h2 id="modal-title">Clear this layout?</h2><p>This removes all {markers.length.toLocaleString()} markers across all planes. You can undo it.</p><div className="modal-actions"><button className="button" onClick={() => setModal(null)}>Keep markers</button><button className="button danger" onClick={() => { commit([]); setSelected(null); setModal(null); }}>Clear markers</button></div></>}
      {modal === "help" && <><h2 id="modal-title">Using the editor</h2><p>Find an area in the sidebar, or jump to exact world coordinates. Zoom in until individual game tiles are visible.</p><div className="help-grid">{TOOLS.map(t => <div key={t.id}><kbd>{t.key}</kbd><strong>{t.name}</strong><span>{t.id === "paint" ? "Click or drag to mark tiles." : t.id === "pan" ? "Drag to move around the world." : t.id === "line" ? "Drag a straight sequence of tiles." : t.id === "rectangle" ? "Drag an outline for an area." : t.id === "erase" ? "Drag to remove markers." : "Click a marker to edit its label or color."}</span></div>)}</div><p><kbd>Space</kbd> + drag pans with any tool. Scroll or pinch to zoom. <kbd>G</kbd> toggles the grid. <kbd>Ctrl / ⌘ Z</kbd> undoes a stroke; add <kbd>Shift</kbd> to redo. Arrow keys move the focused map.</p><div className="instruction-card"><strong>About the map</strong><p>Planes 0–3 are height levels. Caves and instanced encounters can be at separate X/Y coordinates. Buddies presets are area shortcuts, not collision or walkability data. Some empty regions have no images, and map imagery can lag game updates.</p></div><p className="muted-small">Drafts save only in this browser. Export a JSON backup, or share the downloaded JSON with other players. No RuneLite account is required. Independent fan tool; not affiliated with Jagex or RuneLite. Area mapping adapted from Buddies; map imagery by Mejrs.</p><a className="text-link" href="https://github.com/runelite/runelite/wiki/Ground-Markers" target="_blank" rel="noreferrer">RuneLite Ground Markers documentation ↗</a></>}
    </div></dialog>
  </div>;
}
