import { useEffect, useRef, type RefObject } from 'react'

/**
 * Calls `onClickOutside` when a click lands outside the referenced element.
 * Uses `composedPath()` so it works correctly when the element lives inside
 * a shadow DOM (where `event.target` is retargeted to the shadow host).
 *
 * The callback is stored in a ref so the document listener is only
 * registered once — re-renders with a new callback reference won't
 * tear down and re-add the listener.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  { ignore, enabled = true }: { ignore?: string; enabled?: boolean } = {},
) {
  const callbackRef = useRef(onClickOutside)
  callbackRef.current = onClickOutside

  useEffect(() => {
    if (!enabled) return

    function handler(event: MouseEvent) {
      if (ignore) {
        const target = event.target as HTMLElement
        if (target.closest(ignore)) return
      }
      const path = event.composedPath()
      if (ref.current && !path.includes(ref.current)) {
        callbackRef.current()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handler, true)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handler, true)
    }
  }, [ref, ignore, enabled])
}
