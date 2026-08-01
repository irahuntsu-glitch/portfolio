import { gsap, useGsap, splitWords, reducedMotion } from "../lib/anim.js"

const FADED = "rgba(0, 0, 0, 0.13)"
const SOLID = "rgba(0, 0, 0, 1)"

/**
 * Full-width statement that fills in with black word by word as it scrolls
 * through the viewport. Tied to scroll position (scrub) rather than played
 * once, so scrolling back up un-fills it again.
 */
export default function Statement({ text }) {
  const scope = useGsap(() => {
    const el = scope.current?.querySelector(".stmt__p")
    if (!el) return

    const words = splitWords(el)
    if (reducedMotion()) return

    gsap.fromTo(
      words,
      { color: FADED },
      {
        color: SOLID,
        ease: "none",
        stagger: 1,
        scrollTrigger: {
          trigger: el,
          start: "top 78%",
          end: "bottom 55%",
          scrub: true,
        },
      }
    )
  }, [text])

  return (
    <section className="stmt" ref={scope}>
      <div className="wrap">
        <p className="stmt__p">{text}</p>
      </div>
    </section>
  )
}
