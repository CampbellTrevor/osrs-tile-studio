"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { lineTiles, rectangleTiles, type Marker, type Tile } from "../lib/markers";
import {
  clampView,
  imageTileUrl,
  imageWorldBounds,
  isWorldTile,
  panView,
  screenToTile,
  screenToWorld,
  tileScreenRect,
  viewWorldBounds,
  visibleImageTiles,
  worldToScreen,
  zoomAt,
  type Point,
  type Size,
  type View,
} from "../lib/map-math";

export type { View } from "../lib/map-math";
export type Tool = "pan" | "paint" | "erase" | "line" | "rectangle" | "select";
export type MapStatus = { loading: number; loaded: number; missing: number };

export type MapCanvasProps = {
  view: View;
  onViewChange: (view: View) => void;
  markers: Marker[];
  tool: Tool;
  color: string;
  label: string;
  grid: boolean;
  onStroke: (tiles: Tile[], erase: boolean) => void;
  onSelect: (tile: Tile) => void;
  onHover: (tile: Tile | null) => void;
  onStatus: (status: MapStatus) => void;
  onError?: (message: string) => void;
};

type StrokeTool = "paint" | "erase" | "line" | "rectangle";
type Gesture =
  | { kind: "pan"; pointer: number; origin: Point; view: View }
  | { kind: "select"; pointer: number; origin: Point; tile: Tile }
  | { kind: "stroke"; pointer: number; tool: StrokeTool; start: Tile; last: Tile; tiles: Map<string, Tile>; plane: number }
  | { kind: "pinch"; distance: number; anchor: Point; view: View };
type ImageEntry = { image: HTMLImageElement; status: "loading" | "loaded" | "missing"; used: number };

const STROKE_LIMIT = 20_000;
const CACHE_LIMIT = 500;
const INSTRUCTIONS = "Drag to use the selected tool. Hold Space, or drag with the middle or right mouse button, to pan. Scroll to zoom. Use two fingers to pan and pinch. Arrow keys pan; plus and minus zoom; Enter uses the current tool on the center tile; Escape cancels a stroke.";
const tileKey = (tile: Tile) => `${tile.x},${tile.y}`;

function canvasColor(color: string): { rgb: string; alpha: number } {
  if (/^#[0-9a-f]{8}$/i.test(color)) {
    return { rgb: `#${color.slice(3)}`, alpha: parseInt(color.slice(1, 3), 16) / 255 };
  }
  return { rgb: /^#[0-9a-f]{6}$/i.test(color) ? color : "#F3BC66", alpha: 1 };
}

function twoPointerGeometry(points: Map<number, Point>) {
  const [a, b] = [...points.values()];
  return {
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
  };
}

/** Original canvas renderer; image coordinates follow the public Mejrs map format. */
export default function MapCanvas(props: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const viewRef = useRef(clampView(props.view));
  const requestDrawRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    propsRef.current = props;
    viewRef.current = clampView(props.view);
    requestDrawRef.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      propsRef.current.onError?.("Your browser could not start the map canvas. Try reloading this page.");
      return;
    }

    let size: Size = { width: 0, height: 0 };
    let dpr = 1;
    let frame = 0;
    let alive = true;
    let space = false;
    let gesture: Gesture | null = null;
    let hover: Tile | null = null;
    let lastPointer: Point | null = null;
    let lastHoverKey = "";
    let lastStatus = "";
    let imageUse = 0;
    const pointers = new Map<number, Point>();
    const images = new Map<string, ImageEntry>();

    function requestDraw() {
      if (!alive || frame) return;
      frame = requestAnimationFrame(draw);
    }
    requestDrawRef.current = requestDraw;

    function pointIsInside(point: Point): boolean {
      return point.x >= 0 && point.y >= 0 && point.x < size.width && point.y < size.height;
    }

    function updateHover(point: Point | null) {
      lastPointer = point && pointIsInside(point) ? point : null;
      const tile = lastPointer ? screenToTile(lastPointer, viewRef.current, size) : null;
      hover = tile && isWorldTile(tile) ? tile : null;
      const key = hover ? tileKey(hover) : "";
      if (key !== lastHoverKey) {
        lastHoverKey = key;
        propsRef.current.onHover(hover);
      }
      requestDraw();
    }

    function changeView(next: View) {
      viewRef.current = clampView(next);
      propsRef.current.onViewChange(viewRef.current);
      if (lastPointer) updateHover(lastPointer);
      requestDraw();
    }

    function drawTile(tile: Tile, color: string, preview = false, erase = false) {
      if (!ctx) return;
      const rect = tileScreenRect(tile, viewRef.current, size);
      const { rgb, alpha } = canvasColor(erase ? "#FFF58275" : color);
      ctx.fillStyle = rgb;
      ctx.globalAlpha = alpha * (preview ? 0.45 : 0.28);
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = rgb;
      ctx.lineWidth = preview ? 2 : 1.5;
      if (rect.width >= 3) ctx.strokeRect(rect.x + 0.75, rect.y + 0.75, rect.width - 1.5, rect.height - 1.5);
      else {
        ctx.fillRect(rect.x, rect.y, Math.max(1, rect.width), Math.max(1, rect.height));
      }
      ctx.globalAlpha = 1;
    }

    function drawGrid(step: number, color: string, width: number) {
      if (!ctx) return;
      const view = viewRef.current;
      const bounds = viewWorldBounds(view, size);
      ctx.beginPath();
      for (let x = Math.max(0, Math.ceil(bounds.west / step) * step); x <= Math.min(16384, bounds.east); x += step) {
        const screenX = worldToScreen({ x, y: 0 }, view, size).x;
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, size.height);
      }
      for (let y = Math.max(0, Math.ceil(bounds.south / step) * step); y <= Math.min(16384, bounds.north); y += step) {
        const screenY = worldToScreen({ x: 0, y }, view, size).y;
        ctx.moveTo(0, screenY);
        ctx.lineTo(size.width, screenY);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    function draw() {
      frame = 0;
      if (!alive || !ctx || size.width <= 0 || size.height <= 0) return;
      const current = propsRef.current;
      const view = viewRef.current;
      if (gesture?.kind === "stroke" && gesture.plane !== view.plane) gesture = null;
      if (lastPointer) {
        const tile = screenToTile(lastPointer, view, size);
        hover = isWorldTile(tile) ? tile : null;
        const key = hover ? tileKey(hover) : "";
        if (key !== lastHoverKey) {
          lastHoverKey = key;
          current.onHover(hover);
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#101511";
      ctx.fillRect(0, 0, size.width, size.height);

      const visible = visibleImageTiles(view, size);
      const keep = new Set<string>();
      const status: MapStatus = { loading: 0, loaded: 0, missing: 0 };
      for (const tile of visible) {
        const key = `${tile.plane}/${tile.zoom}/${tile.x}/${tile.y}`;
        keep.add(key);
        let entry = images.get(key);
        if (!entry) {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.decoding = "async";
          const fresh: ImageEntry = { image, status: "loading", used: ++imageUse };
          image.onload = () => { fresh.status = "loaded"; requestDraw(); };
          image.onerror = () => { fresh.status = "missing"; requestDraw(); };
          images.set(key, fresh);
          image.src = imageTileUrl(tile);
          entry = fresh;
        }
        entry.used = ++imageUse;
        status[entry.status]++;
        if (entry.status === "loaded") {
          const bounds = imageWorldBounds(tile);
          const topLeft = worldToScreen({ x: bounds.west, y: bounds.north }, view, size);
          const bottomRight = worldToScreen({ x: bounds.east, y: bounds.south }, view, size);
          // Physical-pixel rounding prevents seams between adjacent bitmap images.
          const x = Math.round(topLeft.x * dpr) / dpr;
          const y = Math.round(topLeft.y * dpr) / dpr;
          const width = Math.round(bottomRight.x * dpr) / dpr - x;
          const height = Math.round(bottomRight.y * dpr) / dpr - y;
          ctx.drawImage(entry.image, x, y, width, height);
        }
      }

      if (images.size > CACHE_LIMIT) {
        const old = [...images.entries()].filter(([key]) => !keep.has(key)).sort((a, b) => a[1].used - b[1].used);
        for (const [key, entry] of old) {
          if (images.size <= CACHE_LIMIT) break;
          entry.image.onload = null;
          entry.image.onerror = null;
          images.delete(key);
        }
      }

      if (current.grid) {
        if (view.scale >= 6) drawGrid(1, "rgba(8, 15, 10, 0.28)", 0.65);
        if (view.scale * 64 >= 8) drawGrid(64, "rgba(232, 204, 147, 0.32)", 1);
      }

      const bounds = viewWorldBounds(view, size);
      const visibleMarkers = current.markers.filter(marker => marker.plane === view.plane
        && marker.x + 1 >= bounds.west && marker.x <= bounds.east
        && marker.y + 1 >= bounds.south && marker.y <= bounds.north);
      for (const marker of visibleMarkers) drawTile(marker, marker.color);
      if (gesture?.kind === "stroke") {
        for (const tile of gesture.tiles.values()) drawTile(tile, current.color, true, gesture.tool === "erase");
      }
      if (view.scale >= 10) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `600 ${Math.min(13, Math.max(10, view.scale * 0.42))}px ui-monospace, monospace`;
        ctx.lineWidth = 3;
        for (const marker of visibleMarkers) {
          if (!marker.label) continue;
          const point = worldToScreen({ x: marker.x + 0.5, y: marker.y + 0.5 }, view, size);
          const label = marker.label.length > 36 ? `${marker.label.slice(0, 35)}…` : marker.label;
          ctx.globalAlpha = canvasColor(marker.color).alpha;
          ctx.strokeStyle = "rgba(12, 17, 13, 0.92)";
          ctx.strokeText(label, point.x, point.y);
          ctx.fillStyle = "#fff7e6";
          ctx.fillText(label, point.x, point.y);
        }
        ctx.globalAlpha = 1;
      }
      if (hover && !space && gesture?.kind !== "pan" && gesture?.kind !== "pinch") {
        const rect = tileScreenRect(hover, view, size);
        ctx.fillStyle = "rgba(255, 251, 231, 0.11)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 251, 231, 0.92)";
        ctx.strokeRect(rect.x + 0.75, rect.y + 0.75, Math.max(0.5, rect.width - 1.5), Math.max(0.5, rect.height - 1.5));
      }

      canvas!.style.cursor = gesture?.kind === "pan" || gesture?.kind === "pinch" ? "grabbing"
        : space || current.tool === "pan" ? "grab" : "crosshair";
      const signature = `${status.loading}/${status.loaded}/${status.missing}`;
      if (signature !== lastStatus) {
        lastStatus = signature;
        current.onStatus(status);
      }
    }

    function pointFor(event: PointerEvent | WheelEvent): Point {
      const bounds = canvas!.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }

    function failStroke(message: string) {
      gesture = null;
      propsRef.current.onError?.(message);
      requestDraw();
    }

    function extendStroke(point: Point) {
      if (gesture?.kind !== "stroke" || !pointIsInside(point)) return;
      const stroke = gesture;
      if (stroke.plane !== viewRef.current.plane) {
        gesture = null;
        requestDraw();
        return;
      }
      const tile = screenToTile(point, viewRef.current, size);
      if (!isWorldTile(tile) || (tile.x === stroke.last.x && tile.y === stroke.last.y)) return;
      try {
        const tiles = stroke.tool === "rectangle" ? rectangleTiles(stroke.start, tile)
          : lineTiles(stroke.tool === "line" ? stroke.start : stroke.last, tile);
        if (stroke.tool === "line" || stroke.tool === "rectangle") stroke.tiles.clear();
        for (const item of tiles) {
          stroke.tiles.set(tileKey(item), item);
          if (stroke.tiles.size > STROKE_LIMIT) throw new Error("A stroke can contain at most 20,000 tiles. Zoom in or make a smaller selection.");
        }
        stroke.last = tile;
      } catch (error) {
        failStroke(error instanceof Error ? error.message : "This selection is too large. Try a smaller area.");
      }
      requestDraw();
    }

    function startPinch() {
      const geometry = twoPointerGeometry(pointers);
      gesture = {
        kind: "pinch",
        distance: geometry.distance,
        anchor: screenToWorld(geometry.center, viewRef.current, size),
        view: { ...viewRef.current },
      };
      updateHover(null);
    }

    function pointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && ![0, 1, 2].includes(event.button)) return;
      event.preventDefault();
      canvas!.focus({ preventScroll: true });
      const point = pointFor(event);
      pointers.set(event.pointerId, point);
      canvas!.setPointerCapture(event.pointerId);
      if (pointers.size >= 2) {
        startPinch();
        requestDraw();
        return;
      }
      updateHover(point);
      if (space || propsRef.current.tool === "pan" || event.button === 1 || event.button === 2) {
        gesture = { kind: "pan", pointer: event.pointerId, origin: point, view: { ...viewRef.current } };
      } else {
        const tile = screenToTile(point, viewRef.current, size);
        if (!isWorldTile(tile)) return;
        const tool = propsRef.current.tool;
        if (tool === "select") gesture = { kind: "select", pointer: event.pointerId, origin: point, tile };
        else gesture = {
          kind: "stroke", pointer: event.pointerId, tool, start: tile, last: tile,
          tiles: new Map([[tileKey(tile), tile]]), plane: viewRef.current.plane,
        };
      }
      requestDraw();
    }

    function pointerMove(event: PointerEvent) {
      const point = pointFor(event);
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, point);
      if (gesture?.kind === "pinch" && pointers.size >= 2) {
        const geometry = twoPointerGeometry(pointers);
        const scale = clampView({ ...gesture.view, scale: gesture.view.scale * geometry.distance / gesture.distance }).scale;
        changeView({
          ...gesture.view, scale,
          x: gesture.anchor.x - (geometry.center.x - size.width / 2) / scale,
          y: gesture.anchor.y + (geometry.center.y - size.height / 2) / scale,
        });
        return;
      }
      updateHover(point);
      if (!gesture || gesture.kind === "pinch" || gesture.pointer !== event.pointerId) return;
      if (gesture.kind === "pan") {
        changeView(panView(gesture.view, { x: point.x - gesture.origin.x, y: point.y - gesture.origin.y }));
      } else if (gesture.kind === "stroke") extendStroke(point);
    }

    function pointerUp(event: PointerEvent) {
      const point = pointFor(event);
      if (gesture?.kind === "stroke" && gesture.pointer === event.pointerId) extendStroke(point);
      const completed = gesture;
      pointers.delete(event.pointerId);
      if (completed?.kind === "pinch") {
        if (pointers.size >= 2) startPinch();
        else if (pointers.size === 1) {
          const [pointer, origin] = [...pointers.entries()][0];
          gesture = { kind: "pan", pointer, origin, view: { ...viewRef.current } };
        } else gesture = null;
      } else if (completed && completed.pointer === event.pointerId) {
        gesture = null;
        if (completed.kind === "stroke" && completed.plane === viewRef.current.plane) {
          propsRef.current.onStroke([...completed.tiles.values()], completed.tool === "erase");
        } else if (completed.kind === "select" && Math.hypot(point.x - completed.origin.x, point.y - completed.origin.y) < 6) {
          propsRef.current.onSelect(completed.tile);
        }
      }
      if (canvas!.hasPointerCapture(event.pointerId)) canvas!.releasePointerCapture(event.pointerId);
      if (event.pointerType !== "mouse") updateHover(null);
      requestDraw();
    }

    function pointerCancel(event: PointerEvent) {
      pointers.delete(event.pointerId);
      gesture = null;
      updateHover(null);
      if (canvas!.hasPointerCapture(event.pointerId)) canvas!.releasePointerCapture(event.pointerId);
      requestDraw();
    }

    function pointerLeave() {
      if (!pointers.size) updateHover(null);
    }

    function wheel(event: WheelEvent) {
      event.preventDefault();
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1;
      const delta = Math.max(-300, Math.min(300, event.deltaY * multiplier));
      const point = pointFor(event);
      lastPointer = point;
      changeView(zoomAt(viewRef.current, size, point, viewRef.current.scale * Math.exp(-delta * 0.0025)));
      if (gesture?.kind === "pan") {
        gesture.view = { ...viewRef.current };
        gesture.origin = pointers.get(gesture.pointer) ?? point;
      }
    }

    function keyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === "Space") {
        event.preventDefault();
        space = true;
        if (gesture?.kind === "stroke" || gesture?.kind === "select") {
          const point = pointers.get(gesture.pointer);
          if (point) gesture = { kind: "pan", pointer: gesture.pointer, origin: point, view: { ...viewRef.current } };
        }
        requestDraw();
        return;
      }
      const view = viewRef.current;
      const step = (event.shiftKey ? 160 : 48) / view.scale;
      const deltas: Record<string, Point> = {
        ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step },
      };
      if (deltas[event.key]) {
        event.preventDefault();
        const delta = deltas[event.key];
        lastPointer = { x: size.width / 2, y: size.height / 2 };
        changeView({ ...view, x: view.x + delta.x, y: view.y + delta.y });
      } else if (["+", "=", "-", "_"].includes(event.key)) {
        event.preventDefault();
        changeView({ ...view, scale: view.scale * (["+", "="].includes(event.key) ? Math.SQRT2 : 1 / Math.SQRT2) });
      } else if (event.key === "Escape") {
        gesture = null;
        requestDraw();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const tile = screenToTile({ x: size.width / 2, y: size.height / 2 }, view, size);
        if (!isWorldTile(tile)) return;
        if (propsRef.current.tool === "select") propsRef.current.onSelect(tile);
        else if (propsRef.current.tool !== "pan") propsRef.current.onStroke([tile], propsRef.current.tool === "erase");
      }
    }

    function keyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        space = false;
        requestDraw();
      }
    }

    function blur() {
      space = false;
      gesture = null;
      pointers.clear();
      updateHover(null);
      requestDraw();
    }

    function contextMenu(event: Event) { event.preventDefault(); }

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      size = { width: bounds.width, height: bounds.height };
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.max(1, Math.round(size.width * dpr));
      canvas!.height = Math.max(1, Math.round(size.height * dpr));
      requestDraw();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("pointerleave", pointerLeave);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("contextmenu", contextMenu);
    canvas.addEventListener("keydown", keyDown);
    canvas.addEventListener("blur", blur);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", resize);
    resize();

    return () => {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      requestDrawRef.current = () => {};
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("pointerleave", pointerLeave);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("contextmenu", contextMenu);
      canvas.removeEventListener("keydown", keyDown);
      canvas.removeEventListener("blur", blur);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", resize);
      for (const entry of images.values()) {
        entry.image.onload = null;
        entry.image.onerror = null;
      }
      images.clear();
      pointers.clear();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="map-canvas"
      aria-label="Interactive Old School RuneScape tile marker map"
      aria-description={INSTRUCTIONS}
      tabIndex={0}
      style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
    >
      View OSRS maps and edit tile markers. This interactive map requires a browser with canvas support.
    </canvas>
  );
}
