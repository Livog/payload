import { getSafeRedirect } from 'payload/shared'

export const getSafeAdminRedirect = ({
  adminRoute,
  apiRoute,
  redirectTo,
}: {
  adminRoute: string
  apiRoute: string
  redirectTo: string | string[]
}): string => {
  const redirect = getSafeRedirect({ fallbackTo: adminRoute, redirectTo })

  let pathname: string

  try {
    pathname = decodeURI(new URL(redirect, 'http://localhost').pathname)
  } catch {
    return adminRoute
  }

  const isUnder = (route: string) =>
    route === '/' || pathname === route || pathname.startsWith(`${route}/`)

  return isUnder(adminRoute) && !isUnder(apiRoute) ? redirect : adminRoute
}
