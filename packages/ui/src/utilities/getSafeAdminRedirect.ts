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
  const url = new URL(getSafeRedirect({ fallbackTo: adminRoute, redirectTo }), 'http://localhost')

  // encoded dot, slash, backslash or percent sign
  if (/%(?:2e|2f|5c|25)/i.test(url.pathname)) {
    return adminRoute
  }

  let pathname: string

  try {
    pathname = decodeURI(url.pathname)
  } catch {
    return adminRoute
  }

  const isUnder = (route: string) =>
    route === '/' || pathname === route || pathname.startsWith(`${route}/`)

  return isUnder(adminRoute) && !isUnder(apiRoute)
    ? getSafeRedirect({
        fallbackTo: adminRoute,
        redirectTo: `${url.pathname}${url.search}${url.hash}`,
      })
    : adminRoute
}
