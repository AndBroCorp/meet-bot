import waitForClick from './waitForClick'
import { Page } from 'puppeteer'

export const layouts = {
  auto: 'Auto',
  sidebar: 'Sidebar',
  spotlight: 'Spotlight',
  tiled: 'Tiled',
} as const

export type LayoutKey = keyof typeof layouts

export function isLayoutKey(key: string): key is LayoutKey {
  return key in layouts
}

export async function setLayout(page: Page, layout: keyof typeof layouts) {
  await waitForClick(page, '[aria-label="More options"]')
  // wait for animation to finish before clicking
  await waitForClick(page, `[aria-label="${'Change layout'}"]`, {
    upDown: true,
    waitFor: 500,
  })
  await waitForClick(page, `[aria-label="${layouts[layout]}"]`)
}
