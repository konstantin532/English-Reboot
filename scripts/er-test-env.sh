#!/usr/bin/env bash
# scripts/er-test-env.sh — тестовое окружение English Reboot (dev-инструмент, в sw.js не входит).
#
# Запуск из корня репозитория: bash scripts/er-test-env.sh   (можно повторять)
#   • реестр npm доступен (CI, компьютер автора) → обычный `npm ci`;
#   • закрыт (облачная сессия, 403) → шимы в node_modules/: vitest на node:test
#     (scripts/er-shim/vitest) и @playwright/test → playwright из /opt/npm-tools,
#     браузеры из /opt/pw-browsers. `playwright install` не запускать.
# Создаёт только node_modules/ (он в .gitignore). После него работают `npm test`,
# `npm test -- tests/coach.test.js`, `npm run test:e2e`, `npm run test:screenshots`.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "${ER_ROOT:-$HERE/..}"   # ER_ROOT — другая рабочая копия (git worktree)

NM=node_modules
TOOLS=${ER_NPM_TOOLS:-/opt/npm-tools/node_modules}

if [ -f "$NM/vitest/package.json" ] && ! grep -q er-shim "$NM/vitest/package.json"; then
  echo "er-test-env: настоящие зависимости уже стоят — ничего не делаю"
  exit 0
fi

if timeout 20 npm ping >/dev/null 2>&1; then
  echo "er-test-env: реестр npm доступен → npm ci"
  rm -rf "$NM"
  npm ci
  exit 0
fi

if [ ! -d "$TOOLS/playwright" ]; then
  echo "er-test-env: нет реестра npm и нет $TOOLS/playwright — E2E запустить нечем" >&2
  exit 2
fi

mkdir -p "$NM/.bin" "$NM/@playwright"
rm -rf "$NM/vitest" "$NM/@playwright/test"
cp -R "$HERE/er-shim/vitest" "$NM/vitest"
cp -R "$HERE/er-shim/playwright-test" "$NM/@playwright/test"
ln -sfn "$TOOLS/playwright" "$NM/playwright"
ln -sfn "$TOOLS/playwright-core" "$NM/playwright-core"
ln -sfn ../vitest/bin.js "$NM/.bin/vitest"
ln -sfn ../playwright/cli.js "$NM/.bin/playwright"
chmod +x "$NM/vitest/bin.js"

export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}
echo "er-test-env: шимы готовы (vitest → node:test, @playwright/test → $TOOLS/playwright $(node -p "require('$TOOLS/playwright/package.json').version"))"
