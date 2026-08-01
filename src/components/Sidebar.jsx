import { Link } from "react-router-dom"
import Pill from "./Pill.jsx"
import { gsap, useGsap, reducedMotion, EASE } from "../lib/anim.js"
import { asset, siteContent } from "../lib/content.js"

/**
 * The left column of the home page. It sticks for the whole scroll, exactly
 * like the Framer original: avatar and intro on top, tags pinned to the bottom.
 */
export default function Sidebar() {
  const { profile, links, intro } = siteContent

  const scope = useGsap(() => {
    if (reducedMotion()) return
    gsap
      .timeline({ defaults: { ease: EASE } })
      .from(".side__ava", { scale: 0.7, opacity: 0, duration: 0.7, ease: "back.out(1.6)" })
      .from(".side__headline", { yPercent: 105, duration: 0.9 }, "-=0.4")
      .from(".side__sub", { yPercent: 105, duration: 0.85 }, "-=0.65")
      .from(".side__links > *", { opacity: 0, y: 10, duration: 0.6, stagger: 0.08 }, "-=0.5")
      .from(".side__tags", { opacity: 0, duration: 0.7 }, "-=0.4")
  }, [])

  return (
    <aside className="side" ref={scope}>
      <div className="side__in">
        <Link to="/" className="side__ava-link">
          <img
            className="side__ava"
            src={asset(profile.avatar)}
            alt={profile.name}
            width="72"
            height="72"
          />
        </Link>

        <span className="rl">
          <h1 className="side__headline">{intro.headline}</h1>
        </span>
        <span className="rl">
          <p className="side__sub">{intro.subline}</p>
        </span>

        <div className="side__links">
          {links.map((l) => (
            <Pill key={l.label} label={l.label} href={l.url} />
          ))}
        </div>

        <p className="side__tags">{intro.tags}</p>
      </div>
    </aside>
  )
}
