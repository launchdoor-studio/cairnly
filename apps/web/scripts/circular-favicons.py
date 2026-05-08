#!/usr/bin/env python3
"""Build circular (alpha-masked) favicons and legacy favicon.ico from repo assets/logo.png."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
LOGO = ROOT / "assets" / "logo.png"
WEB = Path(__file__).resolve().parents[1]
APP = WEB / "src" / "app"
PUB = WEB / "public"

# Center square large enough to include the full terracotta disk (~40% of canvas) plus
# visible amber ring around the pebbles (360px was too tight and clipped the orange rim).
CROP_FRACTION_OF_MIN_SIDE = 0.58


def center_crop_square(source: Image.Image, side: int) -> Image.Image:
    w, h = source.size
    side = min(side, min(w, h))
    left = (w - side) // 2
    top = (h - side) // 2
    return source.crop((left, top, left + side, top + side))


def apply_circle(im: Image.Image, margin_ratio: float = 0.032) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    m = max(1, int(min(w, h) * margin_ratio))
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((m, m, w - m, h - m), fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def resize_save(im: Image.Image, size: int, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    scaled = im.resize((size, size), Image.Resampling.LANCZOS)
    scaled.save(path, format="PNG", optimize=True)


def save_favicon_ico(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sizes_px = (16, 32, 48)
    layers = [
        im.resize((s, s), Image.Resampling.LANCZOS).convert("RGBA") for s in sizes_px
    ]
    layers[0].save(
        path,
        format="ICO",
        sizes=[(layer.width, layer.height) for layer in layers],
        append_images=list(layers[1:]),
    )


def main() -> None:
    src = Image.open(LOGO)
    w, h = src.size
    crop_side = int(min(w, h) * CROP_FRACTION_OF_MIN_SIDE)
    base = apply_circle(center_crop_square(src, crop_side))
    resize_save(base, 512, APP / "icon.png")
    resize_save(base, 180, APP / "apple-icon.png")
    resize_save(base, 48, PUB / "favicon-48x48.png")
    resize_save(base, 32, PUB / "favicon-32x32.png")
    resize_save(base, 16, PUB / "favicon-16x16.png")
    resize_save(base, 192, PUB / "android-chrome-192x192.png")
    resize_save(base, 512, PUB / "android-chrome-512x512.png")
    save_favicon_ico(base, PUB / "favicon.ico")


if __name__ == "__main__":
    main()
