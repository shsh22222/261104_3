"""アプリアイコン（PNG）を生成する。依存: Pillow。 python3 scripts/make-icons.py"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
BG = (11, 17, 23)
BRASS = (207, 169, 98)
CORE = (242, 227, 189)


def orb(size, scale=1.0, rounded=True):
    s = size * 4  # 4倍で描いて縮小（なめらかに）
    img = Image.new("RGBA", (s, s), BG + (255,))
    px = img.load()
    cx = cy = s / 2
    halo_r = s * 0.39 * scale
    core_r = s * 0.23 * scale
    for y in range(s):
        for x in range(s):
            d = math.hypot(x - cx, y - cy)
            r, g, b = BG
            # halo
            if d < halo_r:
                a = 0.42 * (1 - d / halo_r) ** 1.6
                r, g, b = (r + (BRASS[0] - r) * a, g + (BRASS[1] - g) * a, b + (BRASS[2] - b) * a)
            # core
            dc = math.hypot(x - cx, (y - cy) + core_r * 0.16)
            if dc < core_r * 1.12:
                t = dc / (core_r * 1.12)
                if t < 0.3:
                    a, col = 1.0, CORE
                else:
                    k = (t - 0.3) / 0.7
                    col = tuple(CORE[i] + (BRASS[i] - CORE[i]) * k for i in range(3))
                    a = (1 - k) ** 1.3
                r, g, b = (r + (col[0] - r) * a, g + (col[1] - g) * a, b + (col[2] - b) * a)
            px[x, y] = (int(r), int(g), int(b), 255)
    img = img.resize((size, size), Image.LANCZOS)
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        return out
    return img


OUT.mkdir(parents=True, exist_ok=True)
orb(192).save(OUT / "icon-192.png")
orb(512).save(OUT / "icon-512.png")
orb(180, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")
orb(512, scale=0.78, rounded=False).convert("RGB").save(OUT / "maskable-512.png")
print("ok")
