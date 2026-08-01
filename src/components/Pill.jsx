import { useRef } from "react"
import { gsap, reducedMotion } from "../lib/anim.js"

/**
 * Pill button whose letters roll up to a duplicate of themselves on hover —
 * the same effect the Framer original used on the header buttons.
 */
export default function Pill({ label, href, onClick, className = "" }) {
  const root = useRef(null)

  const roll = (dir) => {
    if (reducedMotion()) return
    const cols = root.current?.querySelectorAll(".pill__col")
    if (!cols?.length) return
    gsap.to(cols, {
      yPercent: dir > 0 ? -50 : 0,
      duration: 0.42,
      ease: "power3.inOut",
      stagger: 0.022,
      overwrite: true,
    })
  }

  const chars = Array.from(label)
  const inner = (
    <span className="pill__roll" aria-hidden="true">
      {chars.map((ch, i) =>
        ch === " " ? (
          <span className="pill__sp" key={i} />
        ) : (
          <span className="pill__col" key={i}>
            <span>{ch}</span>
            <span>{ch}</span>
          </span>
        )
      )}
    </span>
  )

  const shared = {
    ref: root,
    className: `pill ${className}`,
    onMouseEnter: () => roll(1),
    onMouseLeave: () => roll(-1),
    onFocus: () => roll(1),
    onBlur: () => roll(-1),
  }

  if (href) {
    const external = /^https?:/.test(href)
    return (
      <a
        {...shared}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        <span className="sr-only" style={{ position: "absolute", left: -9999 }}>
          {label}
        </span>
        {inner}
      </a>
    )
  }

  return (
    <button {...shared} type="button" onClick={onClick} aria-label={label}>
      {inner}
    </button>
  )
}
