import { Page } from 'puppeteer'
import { isLayoutKey, setLayout } from './layout'
import { sendChatMessage } from './chat'
import { layouts } from './layout'
import waitForClick from './waitForClick'

export async function processCommand(
  page: Page,
  command: string,
  args: string[]
) {
  if (command === 'layout') {
    const layout = args[0]
    if (isLayoutKey(layout)) {
      await setLayout(page, layout)
    } else {
      await sendChatMessage(
        page,
        `Usage: /layout <${Object.keys(layouts).join('|')}>`
      )
    }
  } else if (command === 'mic') {
    const arg = args[0]
    const micOn = !(await page.$('[aria-label="Turn on microphone"]'))
    if (arg === 'on') {
      if (micOn) {
        throw new Error('Microphone is already on')
      }
      await waitForClick(page, '[aria-label="Turn on microphone"]', {
        timeout: 500,
      })
    } else if (arg === 'off') {
      if (!micOn) {
        throw new Error('Microphone is already off')
      }
      await waitForClick(page, '[aria-label="Turn off microphone"]', {
        timeout: 500,
      })
    } else {
      await sendChatMessage(page, `Usage: /mic <on|off>`)
    }
  } else if (command === 'cam') {
    const arg = args[0]
    const camOn = !(await page.$('[aria-label="Turn on camera"]'))
    if (arg === 'on') {
      if (camOn) {
        throw new Error('Camera is already on')
      }
      await waitForClick(page, '[aria-label="Turn on camera"]', {
        timeout: 500,
      })
    } else if (arg === 'off') {
      if (!camOn) {
        throw new Error('Camera is already off')
      }
      await waitForClick(page, '[aria-label="Turn off camera"]', {
        timeout: 500,
      })
    } else {
      await sendChatMessage(page, `Usage: /cam <on|off>`)
    }
  } else if (command === 'restart') {
    await waitForClick(page, '[aria-label="Leave call"]')
    throw new Error('RESTART')
  } else if (command === 'unpin') {
    await page.evaluate(() => {
      const selector = '[aria-label="Pin yourself to your main screen."]'
      const element: HTMLElement | null = document.querySelector(selector)
      if (!element) {
        throw new Error('Pin button not found')
      }
      if (element.getAttribute('aria-pressed') === 'false') {
        element.click()
      }
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const element: HTMLElement | null = document.querySelector(selector)
          if (!element) {
            reject(new Error('Pin button not found'))
          } else {
            element.click()
            resolve()
          }
        }, 100)
      })
    })
  } else if (command === 'pin') {
    const index = parseInt(args[0], 10)
    await waitForClick(page, '[aria-label="Show participant options"]')
    const selector =
      '[role="presentation"] [aria-label$="to your main screen."]:not([aria-hidden="true"])'
    await page.waitForSelector(selector)
    const elementCount = await page.evaluate(
      (sel, i) => {
        const elements = document.querySelectorAll(sel)
        const element = elements[i]
        if (!element) {
          return elements.length
        } else {
          element.click()
          return null
        }
      },
      selector,
      index
    )
    await page.keyboard.press('Escape')
    await page.waitFor(() => !document.querySelector('[role="tablist"]'))
    if (elementCount !== null) {
      await sendChatMessage(page, `Usage: /pin <0-${elementCount - 1}>`)
    }
  } else if (command === 'help') {
    await sendChatMessage(
      page,
      `Commands: help, mic, cam, layout, unpin, restart, pin`
    )
  }
}
