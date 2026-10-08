// tests/check-skill-config.ts — read-only pre-deploy check.
// Lists every competition that is open or scheduled and whether its skill
// question is complete. Never prints answers. Run: npm run check:skills
import { fetchWooProducts, getWooEffectiveStatus } from '../lib/woocommerce'
import { getSkillConfigProblem } from '../lib/skill-check'

async function main() {
  const { products, error } = await fetchWooProducts()
  if (error) throw new Error(`WooCommerce unavailable: ${error}`)
  let blocking = 0
  for (const p of products) {
    if (!p.competition_type) continue
    const status = getWooEffectiveStatus(p)
    if (status === 'archived' || status === 'closed') continue
    const problem = getSkillConfigProblem(p)
    if (problem) blocking++
    console.log(`${problem ? '✗' : '✓'} #${p.id} [${status}] ${p.name} — ${problem ?? 'skill question complete'}`)
  }
  console.log(blocking ? `\n${blocking} open/scheduled competition(s) would be BLOCKED by the fail-closed skill check.` : '\nAll open/scheduled competitions have a complete skill question.')
  process.exitCode = blocking ? 1 : 0
}
main()
