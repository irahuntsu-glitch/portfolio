import site from "../../content/site.json"
import cases from "../../content/cases.json"

/**
 * Content paths are stored root-relative ("/media/x.png") so the admin can stay
 * simple. On GitHub Pages the site may live under "/<repo>/", so every path has
 * to be prefixed with the Vite base at render time.
 */
const BASE = import.meta.env.BASE_URL || "/"

export function asset(path) {
  if (!path) return ""
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path
  return BASE.replace(/\/$/, "") + "/" + path.replace(/^\//, "")
}

/** Rewrites src/href attributes inside CMS rich text to respect the base path. */
export function rebaseHtml(html) {
  if (!html) return ""
  return html.replace(/(src|href)="\/(?!\/)/g, (_m, attr) => `${attr}="${BASE}`)
}

export const siteContent = site

export const allCases = [...cases]
  .filter((c) => !c.draft)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

export function getCase(slug) {
  return allCases.find((c) => c.slug === slug) || null
}

export function otherCases(slug, count = 3) {
  const i = allCases.findIndex((c) => c.slug === slug)
  if (i < 0) return allCases.slice(0, count)
  const rotated = [...allCases.slice(i + 1), ...allCases.slice(0, i)]
  return rotated.slice(0, count)
}
