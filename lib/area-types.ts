export type Area = {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  plane: number;
  bounds?: [number, number, number, number];
  /** Full room bounds verified independently; naming/guide footprints are not export bounds. */
  exportBounds?: [number, number, number, number];
  regionIds?: number[];
  aliases?: string[];
  kind?: "arena" | "entrance" | "room" | "landmark" | "region";
  source?: string;
  coverage?: "verified" | "unverified";
  verifiedOn?: string;
};
