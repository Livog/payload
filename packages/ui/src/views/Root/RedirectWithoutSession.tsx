'use client'
import { useEffect } from 'react'

import { useAuth } from '../../providers/Auth/index.js'
import { useRouter } from '../../providers/RouterAdapter/index.js'
import { useRouteTransition } from '../../providers/RouteTransition/index.js'

export function RedirectWithoutSession({ to }: { to: string }) {
  const { isSessionChecked, user } = useAuth()
  const router = useRouter()
  const { startRouteTransition } = useRouteTransition()

  useEffect(() => {
    if (isSessionChecked && !user) {
      void startRouteTransition(() => router.replace(to))
    }
  }, [isSessionChecked, router, startRouteTransition, to, user])

  return null
}
