// @astrojs/vercel 7 (the Astro 4 adapter) only knows Node 18 and 20, and Vercel has retired both,
// so after `astro build` point every serverless function at a current Node runtime.
// Runs as part of `npm run build`; drop it once the site moves to Astro 5 and a newer adapter.
import fs from 'node:fs'
import path from 'node:path'

const RUNTIME = 'nodejs22.x'
const dir = '.vercel/output/functions'

if (!fs.existsSync(dir)) process.exit(0)
for (const name of fs.readdirSync(dir)) {
	const file = path.join(dir, name, '.vc-config.json')
	if (!fs.existsSync(file)) continue
	const config = JSON.parse(fs.readFileSync(file, 'utf8'))
	if (config.runtime && config.runtime !== RUNTIME) {
		console.log(`${name}: ${config.runtime} -> ${RUNTIME}`)
		config.runtime = RUNTIME
		fs.writeFileSync(file, JSON.stringify(config, null, '\t') + '\n')
	}
}
