import { Page } from 'puppeteer'
import config from './config'

export async function isOnswitchAccountView(page: Page) {
  const truePromise = page
    .waitForXPath("//div[.='Use another account']")
    .then(() => true)
  const falsePromise = page.waitForSelector('[type="email"]').then(() => false)
  return Promise.race([truePromise, falsePromise])
}

export async function getLoginState(page: Page) {
  const loggedOutPromise = page
    .waitForXPath("//div[.='Sign in']")
    .then(() => 'logged_out')
  const loggedInPromise = page
    .waitForXPath(
      '//div[@role="button"][@aria-disabled="false"]//span[.="Present to meeting"]'
    )
    .then(() => 'logged_in')
  const sessionExpiredPromise = page
    .waitForXPath('//span[.="Verify that it\'s you"]')
    .then(() => 'session_expired')
  const state = await Promise.race([
    loggedInPromise,
    loggedOutPromise,
    sessionExpiredPromise,
  ])
  console.log(`Login state: ${state}`)
  return state
}

export async function login(page: Page) {
  await page.type('[type="password"]', config.password)
  if (await isOnswitchAccountView(page)) {
    const element = await page.waitForXPath("//div[.='Use another account']")
    await page.evaluate(el => el.click(), element)
  }
  await page.waitFor(() => !document.querySelector('[aria-busy="true"]'))
  await page.waitForSelector('[type="email"]')
  await page.type('[type="email"]', config.email)
  await page.keyboard.press('Enter')
  await page.waitForSelector('[type="password"]')
  await page.waitFor(() => !document.querySelector('[aria-busy="true"]'))
  await page.type('[type="password"]', config.password)
  await page.keyboard.press('Enter')
}
