import { Link } from "react-router-dom"
import { asset, placeholders } from "../lib/content.js"
import { slotFor } from "../lib/bento.js"

/**
 * `index` places the card in the bento rhythm. Without it (the "other cases"
 * strip) the card falls back to the plain 16:9 defined in CSS.
 */
export default function CaseCard({ item, index }) {
  const slot = typeof index === "number" ? slotFor(index) : null

  return (
    <Link
      className="kase"
      to={`/case/${item.slug}`}
      style={slot ? { gridColumn: `span ${slot.cols}` } : undefined}
    >
      <div className="kase__media" style={slot ? { aspectRatio: slot.ratio } : undefined}>
        {item.cover && !placeholders ? (
          <div className="kase__par">
            <img className="kase__img" src={asset(item.cover)} alt={item.title} loading="lazy" />
          </div>
        ) : (
          // No cover yet (or placeholder mode) — a grey block keeps the grid even.
          <div className="kase__ph" />
        )}
      </div>
      <span className="kase__title">{item.title}</span>
    </Link>
  )
}
