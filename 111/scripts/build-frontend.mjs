import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = fs.realpathSync(path.join(scriptsDir, '..'))
const frontendDir = fs.realpathSync(path.join(rootDir, 'frontend-vue'))
const result =
  process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run build'], {
        cwd: frontendDir,
        stdio: 'inherit',
      })
    : spawnSync('npm', ['run', 'build'], {
        cwd: frontendDir,
        stdio: 'inherit',
      })

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
