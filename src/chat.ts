import { Page } from 'puppeteer'
import { processCommand } from './commands'
import waitForClick from './waitForClick'

export async function processChatMessage(
  page: Page,
  author: string,
  text: string
) {
  console.log(`${author}: ${text}`)
  if (text.startsWith('/')) {
    const [command, ...args] = text.substr(1).split(' ')
    try {
      await processCommand(page, command, args)
      await sendChatMessage(page, `${author}: Done`)
    } catch (err) {
      if (err.message === 'RESTART') {
        throw err
      }
      console.error(err)
      await sendChatMessage(page, err.message) // TODO not working for failed /pin
      await sendChatMessage(page, `${author}: Command failed :(`)
    }
  }
}

export async function waitForChatMessage(page: Page) {
  const ariaChat = await page.waitForSelector(
    'div[style="position: absolute; top: -1000px; height: 1px; overflow: hidden;"][aria-live="polite"]:not(:empty)',
    { timeout: 0 }
  )
  const innerText: string = await page.evaluate(el => {
    const text = el.innerText
    el.innerHTML = ''
    return text
  }, ariaChat)

  const [author, text] = innerText
    .split(' says this in chat: ')
    .map((text: string) => text.trim())
  if (author && text) {
    return { author, text }
  } else {
    return null
  }
}

export async function sendChatMessage(page: Page, text: string) {
  console.log(`Sending: ${text}`)
  await waitForClick(page, '[aria-label="Chat with other participants"]')
  await page.waitForSelector('textarea')
  for (const line of text.split('\n')) {
    for (const message of line.match(/.{1,500}/g) || []) {
      await page.type('textarea', message)
    }
  }
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Escape')
  await page.waitFor(() => !document.querySelector('[role="tablist"]'))
}
