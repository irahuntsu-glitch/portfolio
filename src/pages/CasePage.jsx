import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import Sidebar from "../components/Sidebar.jsx"
import CaseCard from "../components/CaseCard.jsx"
import NotFound from "./NotFound.jsx"
import { gsap, useGsap, clipReveal, parallax, reducedMotion, EASE } from "../lib/anim.js"
import { asset, rebaseHtml, getCase, otherCases, siteContent } from "../lib/content.js"

export default function CasePage() {
  const { slug } = useParams()
  const item = getCase(slug)

  useEffect(() => {
    if (item) document.title = `${item.title} — ${siteContent.profile.name}`
  }, [item])

  const scope = useGsap(() => {
    if (!scope.current || !item) return

    if (!reducedMotion()) {
      gsap
        .timeline({ defaults: { ease: EASE } })
        .from(".cs__back", { opacity: 0, x: -8, duration: 0.5 })
        .from(".cs__tag", { opacity: 0, y: 10, duration: 0.6 }, "-=0.35")
        .from(".cs__h1", { yPercent: 104, duration: 0.95 }, "-=0.45")

      const hero = scope.current.querySelector(".cs__hero")
      if (hero) {
        clipReveal(hero, { scrollTrigger: null, delay: 0.35 })
        const img = hero.querySelector("img")
        if (img) parallax(img, hero, 2)
      }

      // Rich-text blocks and metrics rise as they enter the viewport.
      scope.current.querySelectorAll(".rt > *, .cs__metrics > div").forEach((b) => {
        gsap.from(b, {
          y: 24,
          opacity: 0,
          duration: 0.75,
          ease: EASE,
          scrollTrigger: { trigger: b, start: "top 90%", once: true },
        })
      })
    }

    scope.current.querySelectorAll(".other .kase").forEach((card) => {
      const media = card.querySelector(".kase__media")
      if (!reducedMotion()) clipReveal(media)
      const img = card.querySelector(".kase__img")
      if (img) parallax(img, media, 2.5)
    })
  }, [slug])

  if (!item) return <NotFound />

  const others = otherCases(slug, 3)

  return (
    <div className="shell" ref={scope}>
      <Sidebar />

      <div className="col">
        <main className="cs">
          <Link className="cs__back" to="/">
            ← Все кейсы
          </Link>

          {item.tagline ? <p className="cs__tag">{item.tagline}</p> : null}
          <span className="rl">
            <h1 className="cs__h1">{item.title}</h1>
          </span>

          {item.cover ? (
            <div className="cs__hero">
              <img src={asset(item.cover)} alt={item.title} />
            </div>
          ) : null}

          {item.metrics?.length ? (
            <div className="cs__metrics">
              {item.metrics.map((m, i) => (
                <div key={i}>
                  <span className="cs__mv">{m.value}</span>
                  <span className="cs__ml">{m.label}</span>
                </div>
              ))}
            </div>
          ) : null}

          <article className="rt" dangerouslySetInnerHTML={{ __html: rebaseHtml(item.body) }} />

          {others.length ? (
            <section className="other">
              <p className="other__h">Другие кейсы</p>
              <div className="other__grid">
                {others.map((c) => (
                  <CaseCard key={c.slug} item={c} />
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}
