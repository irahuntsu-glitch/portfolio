import { gsap, useGsap, reducedMotion, EASE } from "../lib/anim.js"
import { asset, placeholders } from "../lib/content.js"

/** Plain responsive grid of images, revealed in a stagger. */
export default function Gallery({ images }) {
  const scope = useGsap(() => {
    if (reducedMotion()) return
    gsap.from(scope.current.querySelectorAll("img, .ph"), {
      y: 30,
      opacity: 0,
      duration: 0.9,
      ease: EASE,
      stagger: 0.09,
      scrollTrigger: { trigger: scope.current, start: "top 85%", once: true },
    })
  }, [images.join("|")])

  return (
    <div className="wrap" ref={scope}>
      <div className="gal">
        {images.map((src) =>
          placeholders ? (
            <div key={src} className="ph" />
          ) : (
            <img key={src} src={asset(src)} alt="" loading="lazy" />
          )
        )}
      </div>
    </div>
  )
}
