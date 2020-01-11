import { Page } from 'puppeteer'

type waitForClickOptions = {
  upDown?: boolean
  waitFor?: number
  timeout?: number
}

export default async function waitForClick(
  page: Page,
  selector: string,
  { upDown, waitFor, timeout }: waitForClickOptions = {}
) {
  const element = await page.waitForSelector(selector, {
    visible: true,
    timeout,
  })
  waitFor && (await page.waitFor(waitFor))
  if (upDown) {
    await page.evaluate(el => {
      el.dispatchEvent(new Event('mousedown', { bubbles: true }))
      el.dispatchEvent(new Event('mouseup', { bubbles: true }))
    }, element)
  } else {
    await page.evaluate(el => {
      el.dispatchEvent(new Event('click', { bubbles: true }))
    }, element)
  }
}

