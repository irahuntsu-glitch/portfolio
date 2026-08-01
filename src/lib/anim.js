import { useLayoutEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

export const EASE = "power3.out"

/**
 * Lazy images, web fonts and rich-text bodies keep changing the page height
 * after the triggers are created. Without this, everything below the first
 * shift keeps its start state and simply never appears. Watch the document
 * height once, globally, and re-measure whenever it moves.
 */
let heightWatcher = null

function watchLayout() {
  if (heightWatcher || typeof ResizeObserver === "undefined") return

  let last = document.documentElement.scrollHeight
  let queued = 0

  const refresh = () => {
    clearTimeout(queued)
    queued = setTimeout(() => ScrollTrigger.refresh(), 120)
  }

  heightWatcher = new ResizeObserver(() => {
    const now = document.documentElement.scrollHeight
    if (Math.abs(now - last) < 2) return
    last = now
    refresh()
  })
  heightWatcher.observe(document.documentElement)
  heightWatcher.observe(document.body)

  document.fonts?.ready.then(refresh)
  window.addEventListener("load", refresh)
}

/**
 * Runs `fn` inside a gsap.context scoped to the returned ref, and re-runs it
 * whenever `deps` change. Everything created inside is reverted on cleanup, so
 * route changes never leak ScrollTriggers.
 */
export function useGsap(fn, deps = []) {
  const scope = useRef(null)
  useLayoutEffect(() => {
    watchLayout()
    const ctx = gsap.context((self) => fn(self), scope)
    const t = setTimeout(() => ScrollTrigger.refresh(), 200)
    return () => {
      clearTimeout(t)
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return scope
}

/** True when the visitor asked for less motion. */
export function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Splits a text node into word spans so they can be staggered. Returns the
 * created elements. Safe to call once per element — it replaces the content.
 */
export function splitWords(el) {
  const text = el.textContent
  el.textContent = ""
  const frag = document.createDocumentFragment()
  const words = text.split(/(\s+)/)
  const spans = []
  words.forEach((w) => {
    if (/^\s+$/.test(w)) {
      frag.appendChild(document.createTextNode(w))
      return
    }
    const s = document.createElement("span")
    s.className = "stmt__w"
    s.textContent = w
    frag.appendChild(s)
    spans.push(s)
  })
  el.appendChild(frag)
  return spans
}

/** Reveal an element by wiping its clip-path open as it scrolls into view. */
export function clipReveal(target, opts = {}) {
  return gsap.fromTo(
    target,
    { clipPath: "inset(0% 0% 100% 0%)" },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: 1.1,
      ease: "power3.inOut",
      scrollTrigger: { trigger: target, start: "top 88%", once: true },
      ...opts,
    }
  )
}

/** Slow vertical drift for an image inside an overflow-hidden frame. */
export function parallax(inner, frame, amount = 8) {
  return gsap.fromTo(
    inner,
    { yPercent: -amount },
    {
      yPercent: amount,
      ease: "none",
      scrollTrigger: {
        trigger: frame,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    }
  )
}

/**
 * Seamless horizontal marquee. The track must contain the items twice.
 * Scrolling nudges the speed, so the rows feel connected to the page.
 */
export function marquee(track, { speed = 60, direction = -1 } = {}) {
  const x = gsap.quickSetter(track, "x", "px")
  let half = track.scrollWidth / 2
  let pos = direction < 0 ? 0 : -half
  let boost = 0

  // Items are lazy-loaded, so the track keeps growing after the first frame.
  // Re-measure instead of waiting for every image, and keep the current
  // position proportional so the row never jumps.
  const ro = new ResizeObserver(() => {
    const next = track.scrollWidth / 2
    if (!next || Math.abs(next - half) < 1) return
    pos = half ? (pos / half) * next : 0
    half = next
  })
  ro.observe(track)

  const tick = (_t, dt) => {
    if (!half) {
      half = track.scrollWidth / 2
      if (!half) return
    }
    pos += direction * ((speed + boost) * dt) / 1000
    // Manual wrap — the bounds move whenever an image finishes loading.
    while (pos <= -half) pos += half
    while (pos > 0) pos -= half
    x(pos)
    boost *= 0.94
    if (Math.abs(boost) < 0.5) boost = 0
  }

  gsap.ticker.add(tick)

  const st = ScrollTrigger.create({
    trigger: track,
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      boost = Math.min(Math.abs(self.getVelocity()) * 0.12, 900)
    },
  })

  return () => {
    gsap.ticker.remove(tick)
    ro.disconnect()
    st.kill()
  }
}
