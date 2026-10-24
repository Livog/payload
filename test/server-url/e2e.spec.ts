import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'
import * as path from 'path'
import { formatAdminURL } from 'payload/shared'
import { fileURLToPath } from 'url'

import type { PayloadTestSDK } from '../__helpers/shared/sdk/index.js'
import type { Config } from './payload-types.js'

import { assertNetworkRequests } from '../__helpers/e2e/assertNetworkRequests.js'
import { login } from '../__helpers/e2e/auth/login.js'
import { logoutViaNav } from '../__helpers/e2e/auth/logout.js'
import { AdminUrlUtil } from '../__helpers/shared/adminUrlUtil.js'
import { initPayloadE2ENoConfig } from '../__helpers/shared/initPayloadE2ENoConfig.js'
import { initPage } from '../__setup/e2e/initPage.js'
import { POLL_TOPASS_TIMEOUT, TEST_TIMEOUT_LONG } from '../playwright.config.js'
import { verifiedUsersSlug } from './shared.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const ANOTHER_SITE_URL = 'http://another-site.test/'

async function openFromAnotherSite({ href, page }: { href: string; page: Page }): Promise<void> {
  await page.route(ANOTHER_SITE_URL, (route) =>
    route.fulfill({ body: `<a href="${href}">Open admin</a>`, contentType: 'text/html' }),
  )
  await page.goto(ANOTHER_SITE_URL)
  await page.getByRole('link', { name: 'Open admin' }).click()
  await page.unroute(ANOTHER_SITE_URL)
}

test.describe('serverURL', () => {
  let page: Page
  let payload: PayloadTestSDK<Config>
  let url: AdminUrlUtil

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(TEST_TIMEOUT_LONG)

    let serverURL: string
    ;({ payload, serverURL } = await initPayloadE2ENoConfig<Config>({ dirname }))
    url = new AdminUrlUtil(serverURL, 'posts')

    const context = await browser.newContext()
    ;({ page } = await initPage({ context, noAutoLogin: true, serverURL }))
  })

  test('can load admin panel', async () => {
    await login({ page, serverURL: url.serverURL })
    await page.goto(url.admin)
    await expect(page.locator('.dashboard')).toBeVisible()
  })

  test('can log out', async () => {
    await page.goto(url.admin)
    await logoutViaNav(page)
    await expect(page.locator('.login')).toBeVisible()
  })

  test('should open an admin link from another site while logged in', async () => {
    const visitedPaths: string[] = []

    await login({ page, serverURL: url.serverURL })
    page.on('framenavigated', (frame) => visitedPaths.push(new URL(frame.url()).pathname))
    await openFromAnotherSite({ href: url.account, page })

    await expect(page.locator('.payload-settings')).toBeVisible()
    await expect(page).toHaveURL(url.account)
    await expect.poll(() => visitedPaths).not.toContain(new URL(url.login).pathname)
  })

  test('should send a visitor with an invalid session cookie from another site to the login view', async ({
    context: staleContext,
    page: stalePage,
  }) => {
    await staleContext.addCookies([
      { name: 'payload-token', url: url.serverURL, value: 'invalid-session' },
    ])
    await openFromAnotherSite({ href: url.account, page: stalePage })

    await expect(stalePage.locator('#field-email')).toBeVisible()
    await expect(stalePage).toHaveURL(new RegExp(`^${url.login}\\?redirect=`))
  })

  test('should open an admin link from another site when the first /me request fails', async () => {
    await login({ page, serverURL: url.serverURL })
    await page.route('**/api/users/me', (route) => route.fulfill({ status: 500 }), { times: 1 })
    await openFromAnotherSite({ href: url.account, page })

    await expect(page.locator('.payload-settings')).toBeVisible()
    await expect(page).toHaveURL(url.account)
  })

  test('should keep a successful verification from another site while logged in', async () => {
    const email = 'verify-from-another-site@payloadcms.com'

    await login({ page, serverURL: url.serverURL })
    await payload.delete({
      collection: verifiedUsersSlug,
      overrideAccess: true,
      where: { email: { equals: email } },
    })

    const { _verificationToken } = await payload.create({
      collection: verifiedUsersSlug,
      data: { email, password: 'test' },
      overrideAccess: true,
      showHiddenFields: true,
    })

    await openFromAnotherSite({
      href: `${url.admin}/${verifiedUsersSlug}/verify/${_verificationToken}`,
      page,
    })

    await expect(page.locator('.verify__content')).toBeVisible()
    await expect(page).not.toHaveURL(/\/verify\//, { timeout: POLL_TOPASS_TIMEOUT })
  })

  test('should log out through a logout link from another site', async () => {
    await login({ page, serverURL: url.serverURL })
    await assertNetworkRequests(page, '/api/users/me', async () => {
      await openFromAnotherSite({ href: url.logout, page })
      await expect(page.locator('.login')).toBeVisible()
    })
    await expect
      .poll(() =>
        page.evaluate(
          async (meURL) => (await (await fetch(meURL)).json()).user,
          formatAdminURL({ apiRoute: '/api', path: '/users/me', serverURL: url.serverURL }),
        ),
      )
      .toBeNull()
  })
})
