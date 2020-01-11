import path from 'path'
import fs from 'fs'
const configPath = path.join(__dirname, '..', 'config.json')

export type Config = {
  email: string
  password: string
  meeting: string
  layout?: string
}

const json = fs.readFileSync(configPath).toString()
const config: Config = JSON.parse(json)
export default config
