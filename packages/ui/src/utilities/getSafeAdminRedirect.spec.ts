import { describe, expect, it } from 'vitest'

import { getSafeAdminRedirect } from './getSafeAdminRedirect.js'

describe('getSafeAdminRedirect', () => {
  const routes = { adminRoute: '/admin', apiRoute: '/api' }

  it('should keep admin pages with their query', () => {
    expect(
      getSafeAdminRedirect({ ...routes, redirectTo: '/admin/collections/posts?limit=10' }),
    ).toBe('/admin/collections/posts?limit=10')
  })

  it('should send paths outside the admin to the admin route', () => {
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/api/payload-jobs/run' })).toBe('/admin')
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/blog' })).toBe('/admin')
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/administrator' })).toBe('/admin')
  })

  it('should resolve encoded and dot segments before checking', () => {
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/admin/../api/users/me' })).toBe('/admin')
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/admin/%2e%2e/api/users/me' })).toBe(
      '/admin',
    )
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/%61pi/users/me' })).toBe('/admin')
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/admin/%E0%A4%A' })).toBe('/admin')
  })

  it('should reject encoded separators that a server could decode later', () => {
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/admin/..%2fapi/users/me' })).toBe(
      '/admin',
    )
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/admin/..%5capi/users/me' })).toBe(
      '/admin',
    )
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '/admin/%252e%252e/api/users/me' })).toBe(
      '/admin',
    )
  })

  it('should redirect to the normalized path it checked', () => {
    expect(
      getSafeAdminRedirect({ ...routes, redirectTo: '/admin/collections/../account?x=1' }),
    ).toBe('/admin/account?x=1')
  })

  it('should keep the existing checks for other origins', () => {
    expect(getSafeAdminRedirect({ ...routes, redirectTo: '//example.com/admin' })).toBe('/admin')
    expect(getSafeAdminRedirect({ ...routes, redirectTo: 'https://example.com/admin' })).toBe(
      '/admin',
    )
  })

  it('should allow every path except the API when the admin is at the root', () => {
    const rootRoutes = { adminRoute: '/', apiRoute: '/api' }

    expect(getSafeAdminRedirect({ ...rootRoutes, redirectTo: '/collections/posts' })).toBe(
      '/collections/posts',
    )
    expect(getSafeAdminRedirect({ ...rootRoutes, redirectTo: '/api/payload-jobs/run' })).toBe('/')
    expect(getSafeAdminRedirect({ ...rootRoutes, redirectTo: '/x/..//evil.com' })).toBe('/')
    expect(getSafeAdminRedirect({ ...rootRoutes, redirectTo: '/..//evil.com' })).toBe('/')
  })
})
