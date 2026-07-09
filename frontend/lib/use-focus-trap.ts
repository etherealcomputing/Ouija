"use client"

// Focus management for the mobile drawers. A dialog that traps focus, auto-
// focuses its first control on open, and returns focus to the opener on close
// is table stakes for keyboard/AT users — the drawers declared role="dialog"
// aria-modal but did none of it, so focus silently fell to <body>.

import { useEffect, type RefObject } from "react"

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const opener = document.activeElement as HTMLElement | null
    const visibleFocusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)

    // Auto-focus the first control on the next frame (after the enter animation begins).
    const raf = requestAnimationFrame(() => visibleFocusables()[0]?.focus())

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const els = visibleFocusables()
      if (!els.length) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener("keydown", onKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      node.removeEventListener("keydown", onKeyDown)
      // Return focus to whatever opened the drawer, if it's still around.
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [ref, active])
}
