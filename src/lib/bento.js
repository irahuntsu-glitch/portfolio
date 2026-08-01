/**
 * Bento layout for the case grid.
 *
 * The grid has a fixed rhythm: slot 0 is a wide hero, slots 1–2 are a pair of
 * portraits, slot 3 is wide again, slots 4–5 are a landscape pair. A case takes
 * the slot matching its position in the list, so the shape of the next card is
 * known in advance — the admin shows the exact ratio and pixel size to upload.
 */

export const GRID_COLS = 6

export const BENTO = [
  { cols: 4, ratio: "16 / 9", label: "16:9 — широкая", w: 1600, h: 900 },
  { cols: 2, ratio: "4 / 5", label: "4:5 — вертикальная", w: 1000, h: 1250 },
  { cols: 2, ratio: "4 / 5", label: "4:5 — вертикальная", w: 1000, h: 1250 },
  { cols: 4, ratio: "16 / 9", label: "16:9 — широкая", w: 1600, h: 900 },
  { cols: 3, ratio: "3 / 2", label: "3:2 — половина ряда", w: 1400, h: 933 },
  { cols: 3, ratio: "3 / 2", label: "3:2 — половина ряда", w: 1400, h: 933 },
]

export function slotFor(index) {
  return BENTO[index % BENTO.length]
}

/** One-line description of what to upload for the case at this position. */
export function slotHint(index) {
  const s = slotFor(index)
  return `${s.label} · ${s.w}×${s.h} px`
}
