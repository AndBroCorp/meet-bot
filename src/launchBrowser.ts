import puppeteer from 'puppeteer-extra'
import childProcess from 'child_process'
import { promisify } from 'util'
import args from './args'

const exec = promisify(childProcess.exec)

export default async function launchBrowser() {
  let chromePath
  const binPaths = ['google-chrome', 'google-chrome-stable']
  for (const binPath of binPaths) {
    try {
      chromePath = (await exec(`which ${binPath}`)).stdout.trim()
      console.log({ chromePath })
      break
    } catch (err) {}
  }
  if (!chromePath) {
    throw new Error('chrome not found')
  }
  const url = `https://meet.google.com/${args['meet-id']}`
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: args['user-data-dir'],
    args: [
      '--no-sandbox',
      '--start-fullscreen',
      '--lang=en-US',
      '--password-store=basic',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  })
  const context = browser.defaultBrowserContext()
  await context.overridePermissions('https://meet.google.com', [
    'camera',
    'microphone',
    'notifications',
  ])

  const page = await browser.newPage()
  await page.setBypassCSP(true)
  await page.goto(url)
  return { browser, page }
}
