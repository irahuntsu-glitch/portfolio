import { Link } from "react-router-dom"
import { asset } from "../lib/content.js"

export default function CaseCard({ item }) {
  return (
    <Link className="kase" to={`/case/${item.slug}`}>
      <div className="kase__media">
        {item.cover ? (
          <div className="kase__par">
            <img className="kase__img" src={asset(item.cover)} alt={item.title} loading="lazy" />
          </div>
        ) : (
          // No cover uploaded yet — a plain dark block keeps the grid even.
          <div className="kase__ph" />
        )}
      </div>
      <span className="kase__title">{item.title}</span>
    </Link>
  )
}
