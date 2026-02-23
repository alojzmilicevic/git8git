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
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onClickOutside: () => void,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const callbackRef = useRef(onClickOutside)
  callbackRef.current = onClickOutside

  useEffect(() => {
    if (!enabled) return

    function handler(event: MouseEvent) {
      const path = event.composedPath()
      const refsArray = Array.isArray(refs) ? refs : [refs]
      const hitAny = refsArray.some((r) => r.current && path.includes(r.current))
      if (!hitAny) {
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
  }, [refs, enabled])
}
