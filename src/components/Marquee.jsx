import { useGsap, marquee, reducedMotion } from "../lib/anim.js"
import { asset } from "../lib/content.js"

/**
 * Endless horizontal row of images. Items are rendered twice so the track can
 * wrap seamlessly; scroll velocity gives it a nudge.
 */
export default function Marquee({ images, variant = "", speed = 55, direction = -1 }) {
  const scope = useGsap(() => {
    if (reducedMotion()) return
    const track = scope.current?.querySelector(".mq__track")
    if (!track) return

    const stop = marquee(track, { speed, direction })
    return () => stop?.()
  }, [images.join("|")])

  const doubled = [...images, ...images]

  return (
    <div className={`mq ${variant}`} ref={scope}>
      <div className="mq__track">
        {doubled.map((src, i) => (
          <div className="mq__it" key={`${src}-${i}`}>
            <img src={asset(src)} alt="" loading={i < 6 ? "eager" : "lazy"} aria-hidden={i >= images.length} />
          </div>
        ))}
      </div>
    </div>
  )
}
