"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Send } from "lucide-react";
import "./feedback.css";
import { FEEDBACK_KINDS, formatFeedback, type FeedbackContext, type FeedbackDraft, type FeedbackKind } from "../lib/feedback";

type Props = {
  context: FeedbackContext;
  initialKind: FeedbackKind;
  initialArea: string;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
};

export default function FeedbackForm({ context, initialKind, initialArea, onBusyChange, onClose }: Props) {
  const [draft, setDraft] = useState<FeedbackDraft>({ kind: initialKind, area: initialArea, details: "", includeLocation: false });
  const [website, setWebsite] = useState("");
  const [availability, setAvailability] = useState<"checking" | "ready" | "unavailable">("checking");
  const [statusCheck, setStatusCheck] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const copyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [reference, setReference] = useState<number | null>(null);
  const requestRef = useRef<{ body: string; id: string } | null>(null);
  const submitRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    if (copyFallback) { copyTextareaRef.current?.focus(); copyTextareaRef.current?.select(); }
  }, [copyFallback]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; submitRef.current?.abort(); onBusyChange(false); };
  }, [onBusyChange]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let cancelled = false;
    void fetch("/api/feedback/status", { signal: controller.signal, credentials: "omit", cache: "no-store" })
      .then(async response => response.ok && (await response.json()).available === true)
      .then(available => { if (!cancelled) setAvailability(available ? "ready" : "unavailable"); })
      .catch(() => { if (!cancelled) setAvailability("unavailable"); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [statusCheck]);

  function update(changes: Partial<FeedbackDraft>) {
    setDraft(current => ({ ...current, ...changes }));
    setError("");
    setCopyStatus(""); setCopyFallback("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || submitRef.current || availability !== "ready") return;
    try { formatFeedback(draft, context); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Check the feedback fields."); return; }
    const payload = { draft, ...(draft.includeLocation ? { context } : {}), website };
    const body = JSON.stringify(payload);
    if (requestRef.current?.body !== body) requestRef.current = { body, id: crypto.randomUUID() };
    const controller = new AbortController();
    submitRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    setSending(true); onBusyChange(true); setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit",
        body: JSON.stringify({ ...payload, requestId: requestRef.current.id }), signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!mounted.current) return;
      if (!response.ok || result?.ok !== true || !Number.isSafeInteger(result.reference) || result.reference < 1) {
        const message = typeof result?.error === "string" && result.error.length < 400 ? result.error : "Feedback could not be sent. Your text is still here; please try again later.";
        setError(message);
        return;
      }
      setReference(result.reference);
    } catch {
      if (mounted.current) setError("Could not confirm delivery. The report may have reached GitHub. Your text is still here; avoid resubmitting immediately.");
    } finally {
      clearTimeout(timeout); submitRef.current = null;
      if (mounted.current) { setSending(false); onBusyChange(false); }
    }
  }

  async function copyReport() {
    let text: string;
    try { const report = formatFeedback(draft, context); text = `${report.title}\n\n${report.body}`; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Enter feedback details first."); return; }
    try {
      await navigator.clipboard.writeText(text);
      if (mounted.current) { setCopyStatus("Report copied. It has not been sent."); setCopyFallback(""); }
    } catch {
      if (mounted.current) { setCopyStatus("Automatic copying is unavailable. Select and copy the report below. It has not been sent."); setCopyFallback(text); }
    }
  }

  if (reference !== null) return <>
    <h2 id="modal-title">Feedback sent</h2>
    <div className="feedback-receipt" role="status"><Check size={20} /><span>Report #{reference} was added to the issue tracker.</span></div>
    <p>You can close this window. Your tile markers have not changed.</p>
    <div className="modal-actions"><button className="button primary" onClick={onClose}>Done</button></div>
  </>;

  return <>
    <h2 id="modal-title">Send feedback</h2>
    <p>Report a missing area, map problem, or bug, or suggest a change. No account or email address is needed.</p>
    <form className="feedback-form" onSubmit={submit}>
      <fieldset disabled={sending}>
        <label>Type<select value={draft.kind} onChange={event => update({ kind: event.target.value as FeedbackKind })}>{FEEDBACK_KINDS.map(kind => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></label>
        <label>Area or boss <span className="muted-small">(optional)</span><input value={draft.area} onChange={event => update({ area: event.target.value })} maxLength={120} placeholder="e.g. Doom of Mokhaiotl" /></label>
        <label>Details<textarea value={draft.details} onChange={event => update({ details: event.target.value })} required maxLength={1500} placeholder="Which area is missing, or what should change? For a bug, describe what happened and what you expected." /></label>
        <span className="feedback-character-count">{draft.details.length} / 1,500</span>
        <label className="feedback-location"><input type="checkbox" checked={draft.includeLocation} onChange={event => update({ includeLocation: event.target.checked })} /><span>Include current map location<small>{context.area || "Unknown area"} · X {context.x}, Y {context.y} · Plane {context.plane}</small></span></label>
        <div className="feedback-honeypot" aria-hidden="true"><label>Website<input name="website" value={website} onChange={event => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
      </fieldset>
      <p className="muted-small feedback-privacy">Your message is sent to the project maintainer through GitHub. Do not include passwords or personal information. Imported profiles and tile markers are never attached.</p>
      {availability === "checking" && <p className="muted-small" role="status">Checking feedback service…</p>}
      {availability === "unavailable" && <div className="feedback-unavailable" role="status">Feedback is not connected or is temporarily unavailable. Nothing has been sent.<button type="button" className="text-link" onClick={() => { setAvailability("checking"); setStatusCheck(value => value + 1); }}>Check again</button></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {copyStatus && <p className="muted-small" role="status">{copyStatus}</p>}
      {copyFallback && <textarea ref={copyTextareaRef} aria-label="Feedback report to copy" value={copyFallback} readOnly onFocus={event => event.currentTarget.select()} />}
      <div className="modal-actions"><button type="button" className="button" disabled={sending || !draft.details.trim()} onClick={copyReport}>Copy report</button><button type="submit" className="button primary" disabled={sending || availability !== "ready" || !draft.details.trim()}><Send size={15} />{sending ? "Sending…" : "Send feedback"}</button></div>
    </form>
  </>;
}
