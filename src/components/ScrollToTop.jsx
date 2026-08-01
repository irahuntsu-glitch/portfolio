import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { ScrollTrigger } from "../lib/anim.js"

/** Every route change starts at the top and re-measures scroll triggers. */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    ScrollTrigger.refresh()
  }, [pathname])
  return null
}
