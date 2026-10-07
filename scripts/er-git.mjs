/**
 * scripts/er-git.mjs — с чем сравнивать ветку (dev-инструмент скилла english-reboot-evolve).
 * База для сторожа и пакета ревизорам: --base / ER_BASE → ветка-основа открытого PR (для PR поверх
 * другого PR — его ветка, иначе в дифф попадёт чужая работа) → merge-base с origin/main.
 */
import { spawnSync } from 'node:child_process';

export function resolveBase(root, ref) {
  const git = (args) => { const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : ''; };
  if (ref) return ref;
  if (process.env.ER_BASE) return process.env.ER_BASE;
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const url = git(['remote', 'get-url', 'origin']);
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  if (m && branch && branch !== 'HEAD' && !process.env.ER_NO_NET) {
    const r = spawnSync('gh', ['api', `repos/${m[1]}/${m[2]}/pulls?state=open&head=${m[1]}:${branch}`, '--jq', '.[0].base.ref'],
      { cwd: root, encoding: 'utf8', timeout: 20000 });
    const baseRef = r.status === 0 ? r.stdout.trim() : '';
    if (baseRef && baseRef !== 'main') {
      for (const b of [`origin/${baseRef}`, baseRef]) { const mb = git(['merge-base', 'HEAD', b]); if (mb) return mb; }
    }
  }
  for (const b of ['origin/main', 'main']) { const mb = git(['merge-base', 'HEAD', b]); if (mb) return mb; }
  return 'main';
}
