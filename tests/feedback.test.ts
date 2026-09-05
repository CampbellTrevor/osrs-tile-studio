import assert from "node:assert/strict";
import test from "node:test";
import { FEEDBACK_KINDS, formatFeedback, type FeedbackContext, type FeedbackDraft } from "../lib/feedback.ts";

const draft: FeedbackDraft = {
  kind: "missing-area",
  area: "Doom of Mokhaiotl",
  details: "Please add the entrance room.",
  includeLocation: false,
};
const context: FeedbackContext = { area: "Lumbridge", x: 3222, y: 3218, plane: 0 };

test("feedback kinds have stable IDs and plain labels for every supported category", () => {
  assert.deepEqual(FEEDBACK_KINDS, [
    { id: "missing-area", label: "Missing area" },
    { id: "map-problem", label: "Map problem" },
    { id: "bug", label: "Bug" },
    { id: "suggestion", label: "Suggestion" },
  ]);
  for (const kind of FEEDBACK_KINDS) {
    const result = formatFeedback({ ...draft, kind: kind.id, area: "" }, context);
    assert.equal(result.title, kind.label);
    assert.ok(result.body.startsWith(`Type: ${kind.label}\n`));
  }
});

test("feedback contains explicit inputs without implicitly disclosing the current map location", () => {
  assert.deepEqual(formatFeedback(draft, context), {
    title: "Missing area: Doom of Mokhaiotl",
    body: "Type: Missing area\nArea: Doom of Mokhaiotl\n\nDetails:\nPlease add the entrance room.",
  });
  const result = formatFeedback({ ...draft, area: "" }, context);
  assert.equal(result.title, "Missing area");
  assert.doesNotMatch(result.body, /Lumbridge|3222|3218|12850|Map location|Region ID|Plane/);
});

test("opted-in location includes only the selected area, coordinates, derived region ID, and plane", () => {
  const result = formatFeedback({ ...draft, includeLocation: true }, context);
  assert.equal(result.title, "Missing area: Doom of Mokhaiotl");
  assert.ok(result.body.endsWith("Map location:\nArea: Lumbridge\nWorld coordinates: X 3222, Y 3218\nRegion ID: 12850\nPlane: 0"));
  assert.doesNotMatch(formatFeedback({ ...draft, includeLocation: true }, { ...context, area: "" }).body, /Map location:\nArea:/);
});

test("extra app state is never serialized into feedback with or without location", () => {
  const extra = {
    url: "https://private.invalid/#secret-snapshot",
    hash: "private-hash",
    markers: [{ label: "private-marker" }],
    importedProfile: "private-profile",
    name: "private-name",
    account: "private-account",
    localStorage: "private-draft",
  };
  for (const includeLocation of [false, true]) {
    const baseline = formatFeedback({ ...draft, includeLocation }, context);
    const actual = formatFeedback({ ...draft, includeLocation, ...extra }, { ...context, ...extra });
    assert.deepEqual(actual, baseline);
    assert.doesNotMatch(JSON.stringify(actual), /private-/);
  }
});

test("Unicode and punctuation in details remain exact text, and formatting never mutates inputs", () => {
  const details = "  Café — 岩洞 🧙\nA & B? #room=2 / 50%\n<script>example only</script>\r\n  ";
  const input = Object.freeze({ ...draft, area: "  Café\nroom  ", details });
  const location = Object.freeze({ ...context });
  const result = formatFeedback(input, location);
  assert.equal(result.title, "Missing area: Café room");
  assert.ok(result.body.endsWith(`Details:\n${details}`));
  assert.equal(input.area, "  Café\nroom  ");
  assert.equal(input.details, details);
  assert.deepEqual(location, context);
});

test("area and details limits admit their exact boundaries without silent truncation", () => {
  const atLimit = { ...draft, area: "a".repeat(120), details: "界".repeat(1500) };
  const result = formatFeedback(atLimit, { ...context, area: "b".repeat(120) });
  assert.ok(result.title.endsWith(atLimit.area));
  assert.ok(result.body.endsWith(atLimit.details));
  assert.doesNotThrow(() => formatFeedback({ ...draft, area: "", details: "x" }, context));
  assert.throws(() => formatFeedback({ ...draft, area: "a".repeat(121) }, context), /Feedback area.*120/);
  assert.throws(() => formatFeedback(draft, { ...context, area: "a".repeat(121) }), /Map area.*120/);
  assert.throws(() => formatFeedback({ ...draft, details: "x".repeat(1501) }, context), /1,500/);
});

test("empty details, invalid categories, and malformed drafts fail clearly without echoing values", () => {
  for (const details of ["", " \t\n\r", "\u00a0\u2003"]) {
    assert.throws(() => formatFeedback({ ...draft, details }, context), /Enter feedback details/);
  }
  for (const kind of ["", "Bug", "invalid-private-category", "__proto__"]) {
    assert.throws(() => formatFeedback({ ...draft, kind } as FeedbackDraft, context), error => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "Choose a valid feedback type.");
      return true;
    });
  }
  const malformed: unknown[] = [
    null, undefined, "draft", {},
    { ...draft, area: 12 },
    { ...draft, details: null },
    { ...draft, details: 12 },
    { ...draft, includeLocation: "false" },
    { ...draft, includeLocation: undefined },
  ];
  for (const input of malformed) assert.throws(() => formatFeedback(input as FeedbackDraft, context), Error);
});

test("world coordinate and plane boundaries produce the correct regions", () => {
  for (const [x, y, plane, region] of [[0, 0, 0, 0], [63, 63, 1, 0], [64, 63, 2, 256], [63, 64, 3, 1], [16383, 16383, 3, 65535]]) {
    const result = formatFeedback({ ...draft, includeLocation: true }, { area: "", x, y, plane });
    assert.ok(result.body.endsWith(`World coordinates: X ${x}, Y ${y}\nRegion ID: ${region}\nPlane: ${plane}`));
  }
});

test("invalid context is rejected even when location sharing is disabled", () => {
  for (const includeLocation of [false, true]) {
    for (const value of [-1, 16384, 1.5, NaN, Infinity, "3222", null]) {
      for (const key of ["x", "y"]) {
        assert.throws(() => formatFeedback({ ...draft, includeLocation }, { ...context, [key]: value } as FeedbackContext), /Map coordinates/);
      }
    }
    for (const plane of [-1, 4, 0.5, NaN, Infinity, "0", null]) {
      assert.throws(() => formatFeedback({ ...draft, includeLocation }, { ...context, plane } as FeedbackContext), /Map plane/);
    }
    for (const invalid of [null, undefined, "context", {}, { ...context, area: null }]) {
      assert.throws(() => formatFeedback({ ...draft, includeLocation }, invalid as FeedbackContext), Error);
    }
  }
});
