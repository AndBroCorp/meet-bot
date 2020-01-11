// TODO
// re-login on expired session
// detect errors/meeting ended and auto restart
// switch mic/cam device
// /pin
// /version
// /upgrade
// /repeat - show chat history

const puppeteer = require('puppeteer-extra')
const childProcess = require('child_process')
const { promisify } = require('util')
const path = require('path')
const config = require('./config.json')
const exec = promisify(childProcess.exec)

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

async function isLoggedIn(page) {
  const loggedOutPromise = page
    .waitForXPath("//div[.='Sign in']")
    .then(() => false)
  const loggedInPromise = page
    .waitForSelector('[aria-label="Join meeting"]')
    .then(() => true)
  const loggedIn = await Promise.race([loggedInPromise, loggedOutPromise])
  console.log(`Logged ${loggedIn ? 'in' : 'out'}`)
  return loggedIn
}

async function waitForClick(page, selector, { upDown, waitFor, timeout } = {}) {
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

async function clickOption(page, option) {
  await waitForClick(page, '[aria-label="More options"]')
  // wait for animation to finish before clicking
  await waitForClick(page, `[aria-label="${option}"]`, {
    upDown: true,
    waitFor: 500,
  })
}

const layouts = {
  auto: 'Auto',
  sidebar: 'Sidebar',
  spotlight: 'Spotlight',
  tiled: 'Tiled',
}
async function setLayout(page, layout) {
  await clickOption(page, 'Change layout')
  await waitForClick(page, `[aria-label="${layouts[layout]}"]`)
}

async function launchBrowser() {
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
  const userDataDir = path.join(__dirname, '.user-data')
  const url = `https://meet.google.com/${config.meeting}`
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir,
    args: ['--no-sandbox', '--start-fullscreen'],
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

async function isOnswitchAccountView(page) {
  const truePromise = page
    .waitForXPath("//div[.='Use another account']")
    .then(() => false)
  const falsePromise = page.waitForSelector('[type="email"]').then(() => true)
  return Promise.race([truePromise, falsePromise])
}

async function login(page) {
  const signIn = await page.waitForXPath("//span[.='Sign in']")
  await page.evaluate(el => el.click(), signIn)
  if (await isOnswitchAccountView(page)) {
    const element = page.waitForXPath("//div[.='Use another account']")
    await page.evaluate(el => el.click(), element)
  }
  await page.waitForSelector('[type="email"]')
  await page.type('[type="email"]', config.email)
  await page.keyboard.press('Enter')
  await page.waitForSelector('[type="password"]')
  await page.waitFor(() => !document.querySelector('[aria-busy="true"]'))
  await page.type('[type="password"]', config.password)
  await page.keyboard.press('Enter')
}

async function processCommand(page, command, args) {
  if (command === 'layout') {
    const layout = args[0]
    if (layout in layouts) {
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
      const element = document.querySelector(selector)
      if (element.getAttribute('aria-pressed') === 'false') {
        element.click()
      }
      setTimeout(() => {
        document.querySelector(selector).click()
      }, 100)
    })
  } else if (command === 'pin') {
    const index = parseInt(args[0], 10)
    await waitForClick(page, '[aria-label="Show participant options"]')
    const selector =
      '[role="presentation"] [aria-label$="to your main screen."]:not([aria-hidden="true"])'
    await page.waitForSelector(selector)
    const success = page.evaluate(
      (sel, i) => {
        const elements = document.querySelectorAll(sel)
        const element = elements[i]
        if (!element) {
          return false
        } else {
          element.click()
          return true
        }
      },
      selector,
      index
    )
    await page.keyboard.press('Escape')
    await page.waitFor(() => !document.querySelector('[role="tablist"]'))
    if (!success) {
      await sendChatMessage(page, `Usage: /pin <0-${elements.length - 1}>`)
    }
  } else if (command === 'help') {
    await sendChatMessage(
      page,
      `Commands: help, mic, cam, layout, unpin, restart, pin`
    )
  }
}

async function processChatMessage(page, author, text) {
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

async function waitForChatMessage(page) {
  // TODO also wait for Return to home screen
  const ariaChat = await page.waitForSelector(
    'div[style="position: absolute; top: -1000px; height: 1px; overflow: hidden;"][aria-live="polite"]:not(:empty)',
    { timeout: 0 }
  )
  const text = await page.evaluate(el => {
    const text = el.innerText
    el.innerHTML = ''
    return text
  }, ariaChat)

  const [author, message] = text
    .split(' says this in chat: ')
    .map(text => text.trim())
  if (author && message) {
    await processChatMessage(page, author, message)
  }
}

async function run(page) {
  const loggedIn = await isLoggedIn(page)
  if (!loggedIn) {
    await login(page)
  }

  await waitForClick(page, '[aria-label="Join meeting"]')
  await page.waitForSelector('[aria-label="Leave call"]')

  await setLayout(page, config.layout)
  await sendChatMessage(page, 'Connected')
  console.log('Waiting for chat messages')
  while (1) {
    await waitForChatMessage(page)
  }
}

const restarts = []

async function sendChatMessage(page, text) {
  console.log(`Sending: ${text}`)
  await waitForClick(page, '[aria-label="Chat with other participants"]')
  await page.waitForSelector('textarea')
  for (const line of text.split('\n')) {
    for (const message of line.match(/.{1,500}/g)) {
      await page.type('textarea', message)
    }
  }
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Escape')
  await page.waitFor(() => !document.querySelector('[role="tablist"]'))
}

async function main() {
  while (1) {
    restarts.push(new Date())
    const recentRestarts = restarts.filter(
      date => date > new Date() - 60 * 60 * 1000
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
