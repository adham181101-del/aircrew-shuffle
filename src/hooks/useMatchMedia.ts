import { useSyncExternalStore } from 'react'

export function useMatchMedia(query: string): boolean {
  const subscribe = (onStoreChange: () => void) => {
    if (typeof window === 'undefined') return () => {}
    const m = window.matchMedia(query)
    m.addEventListener('change', onStoreChange)
    return () => m.removeEventListener('change', onStoreChange)
  }
  const getSnapshot = () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches)

  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
