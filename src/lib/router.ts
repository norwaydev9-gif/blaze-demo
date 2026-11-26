import { useEffect, useState } from 'react'

export interface Route {
  path: string
  segments: string[]
  query: URLSearchParams
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [rawPath, rawQuery = ''] = raw.split('?')
  const path = rawPath || '/'
  return {
    path,
    segments: path.split('/').filter(Boolean),
    query: new URLSearchParams(rawQuery),
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const onHash = () => {
      setRoute(parse())
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}

export function navigate(to: string): void {
  const target = to.startsWith('#') ? to : `#${to}`
  if (window.location.hash === target) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  window.location.hash = target
}

export function goBack(fallback = '/') {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback)
}
