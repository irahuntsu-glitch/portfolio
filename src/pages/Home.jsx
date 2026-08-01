import { useEffect } from "react"
import Sidebar from "../components/Sidebar.jsx"
import CaseCard from "../components/CaseCard.jsx"
import Statement from "../components/Statement.jsx"
import Marquee from "../components/Marquee.jsx"
import Gallery from "../components/Gallery.jsx"
import { gsap, useGsap, clipReveal, parallax, reducedMotion, EASE } from "../lib/anim.js"
import { siteContent, allCases } from "../lib/content.js"

export default function Home() {
  const { sections, meta } = siteContent

  useEffect(() => {
    document.title = meta.title
  }, [meta.title])

  const scope = useGsap(() => {
    scope.current.querySelectorAll(".kase").forEach((card, i) => {
      const media = card.querySelector(".kase__media")
      const img = card.querySelector(".kase__img")

      if (!reducedMotion()) {
        clipReveal(media, { delay: (i % 2) * 0.08 })
        gsap.from(card.querySelector(".kase__title"), {
          opacity: 0,
          y: 12,
          duration: 0.7,
          ease: EASE,
          scrollTrigger: { trigger: card, start: "top 84%", once: true },
        })
      }
      if (img) parallax(img, media, 2.5)
    })
  }, [])

  return (
    <div className="shell" ref={scope}>
      <Sidebar />

      <div className="col">
        <main>
          <section className="cases">
            <div className="cases__grid">
              {allCases.map((c, i) => (
                <CaseCard key={c.slug} item={c} index={i} />
              ))}
            </div>
          </section>

          {sections.map((s) => (
            <section key={s.id}>
              <Statement text={s.statement} />
              {s.layout === "marquee" ? (
                <Marquee
                  images={s.images}
                  variant={s.id === "posters" ? "mq--posters" : ""}
                  direction={s.id === "posters" ? 1 : -1}
                  speed={s.id === "posters" ? 45 : 55}
                />
              ) : (
                <Gallery images={s.images} />
              )}
            </section>
          ))}
        </main>
      </div>
    </div>
  )
}
