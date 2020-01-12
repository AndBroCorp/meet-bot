import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import launchBrowser from './launchBrowser'
import puppeteer from 'puppeteer-extra'
import waitForClick from './waitForClick'
import { Page } from 'puppeteer'
import { setLayout } from './layout'
import { login, getLoginState } from './login'
import { sendChatMessage, waitForChatMessage, processChatMessage } from './chat'
import args from './args'
// @ts-ignore
import UserPreferencesPlugin from 'puppeteer-extra-plugin-user-preferences'

puppeteer.use(StealthPlugin())
puppeteer.use(
  UserPreferencesPlugin({
    userPrefs: {
      credentials_enable_service: false,
      profile: {
        password_manager_enabled: false,
      },
    },
  })
)

async function assertLanguage(page: Page) {
  const html = await page.waitForSelector('html')
  const lang = await page.evaluate(el => el.getAttribute('lang'), html)
  if (lang.split('-')[0] !== 'en') {
    console.error(`ERROR: Invalid language: ${lang}`)
    console.error(
      `Change default language to English: https://myaccount.google.com/language`
    )
    process.exit(1)
  }
}

async function assertInvited(page: Page) {
  const element = await page.$('[aria-label="Ask to join the meeting"]')
  if (element) {
    console.error(`ERROR: Not invited`)
    console.error(
      `You need to grant access by creating a calendar event or by using a google account which is part of your organization, see README.md.`
    )
    process.exit(1)
  }
}

async function run(page: Page) {
  await assertLanguage(page)
  const loginState = await getLoginState(page)
  if (loginState === 'logged_out') {
    const signIn = await page.waitForXPath("//span[.='Sign in']")
    await page.evaluate(el => el.click(), signIn)
    await page.waitFor(() => {
      return window.location.href.includes('ServiceLogin')
    })
    await page.evaluate(() => {
      window.location.href = window.location.href + '&hl=en'
    })
    await login(page)
  } else if (loginState === 'session_expired') {
    const next = await page.waitForXPath("//span[.='Next']")
    await page.evaluate(el => el.click(), next)
    await waitForClick(page, '[aria-label$="Switch account"]')
    await login(page)
  }

  await page.waitForXPath('//span[.="Present to meeting"]')
  await assertInvited(page)

  await waitForClick(page, '[aria-label="Join meeting"]')
  await page.waitForSelector('[aria-label="Leave call"]')

  await setLayout(page, args.layout)

  await sendChatMessage(page, 'Connected')
  console.log('Waiting for chat messages')

  const errorPromise = page
    .waitForFunction(
      () => {
        return !document.querySelector('[aria-label="Leave call"]')
      },
      { timeout: 0, polling: 300 }
    )
    .then(() => {
      throw new Error('Call ended')
    })

  while (1) {
    const message = await Promise.race([errorPromise, waitForChatMessage(page)])
    if (message) {
      const { author, text } = message
      await processChatMessage(page, author, text)
    }
  }
}

const restarts: number[] = []

async function main() {
  while (1) {
    restarts.push(+new Date())
    const recentRestarts = restarts.filter(
      date => date > +new Date() - 60 * 60 * 1000
    )
    if (recentRestarts.length > 5) {
      console.error('Five restarts within one hour, exiting.')
      process.exit(1)
    }
    const { browser, page } = await launchBrowser()
    try {
      console.log('Starting')
      await run(page)
    } catch (err) {
      await new Promise(res => setTimeout(res, 1000))
      console.error(err)
    }
    await browser.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
