import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'
import * as path from 'path'
import { formatAdminURL } from 'payload/shared'
import { fileURLToPath } from 'url'

import { login } from '../__helpers/e2e/auth/login.js'
import { logoutViaNav } from '../__helpers/e2e/auth/logout.js'
import { AdminUrlUtil } from '../__helpers/shared/adminUrlUtil.js'
import { initPayloadE2ENoConfig } from '../__helpers/shared/initPayloadE2ENoConfig.js'
import { initPage } from '../__setup/e2e/initPage.js'
import { TEST_TIMEOUT_LONG } from '../playwright.config.js'

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
  let url: AdminUrlUtil

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(TEST_TIMEOUT_LONG)

    const { payload, serverURL } = await initPayloadE2ENoConfig({ dirname })
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
    await login({ page, serverURL: url.serverURL })
    await openFromAnotherSite({ href: url.account, page })

    await expect(page.locator('.payload-settings')).toBeVisible()
    await expect(page).toHaveURL(url.account)
  })

  test('should open an admin link from another site when the first /me request fails', async () => {
    await login({ page, serverURL: url.serverURL })
    await page.route('**/api/users/me', (route) => route.fulfill({ status: 500 }), { times: 1 })
    await openFromAnotherSite({ href: url.account, page })

    await expect(page.locator('.payload-settings')).toBeVisible()
    await expect(page).toHaveURL(url.account)
  })

  test('should log out through a logout link from another site', async () => {
    await login({ page, serverURL: url.serverURL })

    let meRequestCount = 0

    await page.route('**/api/users/me', (route) => {
      meRequestCount += 1
      return route.continue()
    })
    await openFromAnotherSite({ href: url.logout, page })

    await expect(page.locator('.login')).toBeVisible()
    await page.unroute('**/api/users/me')
    await expect.poll(() => meRequestCount).toBe(1)
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
