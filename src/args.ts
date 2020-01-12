import yargs from 'yargs'
import { layouts, LayoutKey } from './layout'
import { join } from 'path'
import { homedir } from 'os'

const defaultLayout: LayoutKey = 'auto'
export default yargs
  .option('email', {
    alias: 'e',
    type: 'string',
    demandOption: true,
    describe: 'Google account email address',
    defaultDescription: 'example@gmail.com',
  })
  .option('password', {
    alias: 'p',
    type: 'string',
    demandOption: true,
    describe: 'Google account password',
    defaultDescription: 'hunter2',
  })
  .option('meet-id', {
    alias: 'm',
    type: 'string',
    demandOption: true,
    describe:
      'Meeting ID  - Found at the end of the meeting URL (https://meet.google.com/ID)',
    defaultDescription: 'abc-asdf-qwe',
  })
  .option('layout', {
    alias: 'l',
    choices: Object.keys(layouts),
    default: defaultLayout,
    describe:
      'The default meeting layout to set after connecting to the meeting',
  })
  .option('user-data-dir', {
    type: 'string',
    default: join(homedir(), '.meet-bot-chrome-profile'),
    describe: 'Chrome user data location',
  })
  .env('MEET_BOT').argv
