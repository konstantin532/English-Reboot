#!/usr/bin/env bash
# scripts/er-shots.sh — скриншоты «до/после» одной командой (dev-инструмент скилла english-reboot-evolve).
#
#   bash scripts/er-shots.sh before   # снять 5 PNG → /tmp/er-shots/before, вернуть docs/screenshots как в git
#   bash scripts/er-shots.sh after    # то же → /tmp/er-shots/after и сравнить с before попиксельно
#
# Для различающихся пар кладёт склейку «до | после | разница» в /tmp/er-shots/diff/<имя>.png —
# смотреть глазами нужно только её (одна картинка на пару), совпавшие не открывать.
# Не запускать одновременно с E2E: оба поднимают сервер на порту 8123.
# Папка: $ER_SHOTS или /tmp/er-shots. Код выхода: 0 — снято (и сравнено), 2 — не снято.
set -uo pipefail
cd "$(dirname "$0")/.."

LABEL=${1:-}
case "$LABEL" in before|after) ;; *) echo "использование: bash scripts/er-shots.sh before|after" >&2; exit 2;; esac
BASE=${ER_SHOTS:-/tmp/er-shots}
DEST="$BASE/$LABEL"
LOG="$BASE/$LABEL.log"
mkdir -p "$BASE"
rm -rf "$DEST" && mkdir -p "$DEST"

[ -d node_modules/@playwright/test ] || bash scripts/er-test-env.sh >/dev/null

if ! npm run test:screenshots >"$LOG" 2>&1; then
  git checkout -- docs/screenshots 2>/dev/null
  echo "er-shots: скриншоты не сняты — хвост лога ($LOG):"
  tail -n 15 "$LOG"
  exit 2
fi
cp docs/screenshots/*.png "$DEST/"
git checkout -- docs/screenshots
n=$(ls "$DEST"/*.png 2>/dev/null | wc -l)
echo "er-shots: $LABEL — $n PNG в $DEST; docs/screenshots возвращены как в git"

[ "$LABEL" = after ] || exit 0
if [ ! -d "$BASE/before" ]; then echo "er-shots: нет $BASE/before — сравнивать не с чем"; exit 0; fi

rm -rf "$BASE/diff" && mkdir -p "$BASE/diff"
if python3 -c 'import PIL' 2>/dev/null; then
  python3 -I - "$BASE/before" "$DEST" "$BASE/diff" <<'PY'
import os, sys
from PIL import Image, ImageChops
before, after, out = sys.argv[1:4]
names = sorted(set(os.listdir(before)) | set(os.listdir(after)))
same = noise = 0
for n in names:
    if not n.endswith('.png'):
        continue
    a, b = os.path.join(before, n), os.path.join(after, n)
    if not os.path.exists(a) or not os.path.exists(b):
        print(f'  {n}: только {"после" if os.path.exists(b) else "до"}')
        continue
    ia, ib = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    box = None
    if ia.size != ib.size:
        print(f'  {n}: другой размер {ia.size} → {ib.size} — смотреть {out}/{n}')
    else:
        if not ImageChops.difference(ia, ib).getbbox():
            same += 1
            continue
        # заметная разница — пиксели, где яркость разницы > 16; меньше — шум сглаживания
        mask = ImageChops.difference(ia, ib).convert('L').point(lambda p: 255 if p > 16 else 0)
        box = mask.getbbox()
        if not box:
            noise += 1
            continue
        px = mask.histogram()[255]
        pct = 100 * px / (ia.size[0] * ia.size[1])
        hint = ' (крошечная — сглаживание/анимация?)' if pct < 0.1 else ''
        print(f'  {n}: отличается {pct:.2f}% пикселей, область {box}{hint} — смотреть {out}/{n}')
    # склейка «до | после | разница» — только область изменений с полями, чтобы картинка была небольшой
    if box:
        m = 120
        box = (max(0, box[0] - m), max(0, box[1] - m), min(ia.size[0], box[2] + m), min(ia.size[1], box[3] + m))
        ia, ib, mk = ia.crop(box), ib.crop(box), mask.crop(box)
    w, h = max(ia.size[0], ib.size[0]), max(ia.size[1], ib.size[1])
    canvas = Image.new('RGB', (w * 3 + 20, h), 'white')
    canvas.paste(ia, (0, 0)); canvas.paste(ib, (w + 10, 0))
    if box:
        hl = ib.copy(); hl.paste((255, 0, 200), mask=mk)
        canvas.paste(hl, (2 * w + 20, 0))
    if canvas.size[0] > 2400:
        canvas = canvas.resize((2400, max(1, round(canvas.size[1] * 2400 / canvas.size[0]))))
    canvas.save(os.path.join(out, n))
total = len([n for n in names if n.endswith(".png")])
print(f'er-shots: совпали попиксельно {same} из {total}' + (f', ещё {noise} — только шум сглаживания (смотреть не нужно)' if noise else ''))
PY
else
  same=0; total=0
  for f in "$DEST"/*.png; do
    total=$((total+1)); n=$(basename "$f")
    if cmp -s "$f" "$BASE/before/$n"; then same=$((same+1)); else echo "  $n: отличается (PIL нет — открыть before/after парой)"; fi
  done
  echo "er-shots: совпали побайтно $same из $total"
fi
