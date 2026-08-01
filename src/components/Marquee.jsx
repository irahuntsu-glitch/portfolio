import { useGsap, marquee, reducedMotion } from "../lib/anim.js"
import { asset, placeholders } from "../lib/content.js"

const PH_RATIOS = ["3 / 2", "2 / 3", "1 / 1", "16 / 9", "4 / 5", "5 / 4"]

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
          <div
            className="mq__it"
            key={`${src}-${i}`}
            // Placeholder blocks cycle through ratios so the row still shows
            // that photos of any proportion can be uploaded.
            style={placeholders ? { aspectRatio: PH_RATIOS[i % PH_RATIOS.length] } : undefined}
          >
            {placeholders ? (
              <div className="ph" />
            ) : (
              <img
                src={asset(src)}
                alt=""
                loading={i < 6 ? "eager" : "lazy"}
                aria-hidden={i >= images.length}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
