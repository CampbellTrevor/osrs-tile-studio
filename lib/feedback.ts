export type FeedbackKind = "missing-area" | "map-problem" | "bug" | "suggestion";

export type FeedbackContext = {
  area: string;
  x: number;
  y: number;
  plane: number;
};

export type FeedbackDraft = {
  kind: FeedbackKind;
  area: string;
  details: string;
  includeLocation: boolean;
};

export const FEEDBACK_KINDS = [
  { id: "missing-area", label: "Missing area" },
  { id: "map-problem", label: "Map problem" },
  { id: "bug", label: "Bug" },
  { id: "suggestion", label: "Suggestion" },
] as const satisfies readonly { id: FeedbackKind; label: string }[];

function validateArea(value: unknown, source: string): asserts value is string {
  if (typeof value !== "string" || value.length > 120) {
    throw new Error(`${source} must be text with at most 120 characters.`);
  }
}

function validInteger(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximum;
}

/** Format only deliberate feedback inputs and, when opted in, the map location. */
export function formatFeedback(draft: FeedbackDraft, context: FeedbackContext): { title: string; body: string } {
  if (!draft || typeof draft !== "object") throw new Error("Feedback must be a valid draft.");
  const kind = FEEDBACK_KINDS.find(option => option.id === draft.kind);
  if (!kind) throw new Error("Choose a valid feedback type.");
  validateArea(draft.area, "Feedback area");
  if (typeof draft.details !== "string" || !draft.details.trim()) {
    throw new Error("Enter feedback details.");
  }
  if (draft.details.length > 1500) throw new Error("Feedback details must be at most 1,500 characters.");
  if (typeof draft.includeLocation !== "boolean") throw new Error("Choose whether to include the map location.");

  if (!context || typeof context !== "object") throw new Error("Map context must be valid.");
  validateArea(context.area, "Map area");
  if (!validInteger(context.x, 16383) || !validInteger(context.y, 16383)) {
    throw new Error("Map coordinates must be whole numbers from 0 to 16,383.");
  }
  if (!validInteger(context.plane, 3)) throw new Error("Map plane must be a whole number from 0 to 3.");

  const titleArea = draft.area.trim().replace(/\s+/gu, " ");
  const title = titleArea ? `${kind.label}: ${titleArea}` : kind.label;
  const lines = [`Type: ${kind.label}`];
  if (draft.area.trim()) lines.push(`Area: ${draft.area}`);
  lines.push("", "Details:", draft.details);

  if (draft.includeLocation) {
    const regionId = ((context.x >> 6) << 8) | (context.y >> 6);
    lines.push("", "Map location:");
    if (context.area.trim()) lines.push(`Area: ${context.area}`);
    lines.push(`World coordinates: X ${context.x}, Y ${context.y}`, `Region ID: ${regionId}`, `Plane: ${context.plane}`);
  }

  return { title, body: lines.join("\n") };
}
