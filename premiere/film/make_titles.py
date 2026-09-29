"""
Render the brand-film title cards (1920x1080, black background) in the style of the
MOVLABS ART STAND reference: centred white Korean copy with a soft glow, a high-contrast
serif product wordmark and a heavy geometric brand wordmark.

    python3 premiere/film/make_titles.py FONT_DIR [OUT_DIR]

FONT_DIR must contain (all SIL Open Font License):
    Pretendard-SemiBold.otf, Pretendard-Light.otf      (npm: pretendard)
    BodoniModa-400.ttf                                  (npm: @fontsource/bodoni-moda, woff -> ttf)
    Montserrat-800.ttf                                  (npm: @fontsource/montserrat, woff -> ttf)
Copy text lives in copy.json next to this file.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
HERE = os.path.dirname(os.path.abspath(__file__))


def font(dir_, name, size):
    return ImageFont.truetype(os.path.join(dir_, name), size)


def text_width(draw, text, fnt, tracking=0):
    if not tracking:
        return draw.textlength(text, font=fnt)
    return sum(draw.textlength(ch, font=fnt) for ch in text) + tracking * (len(text) - 1)


def draw_text(draw, xy, text, fnt, fill, tracking=0):
    x, y = xy
    if not tracking:
        draw.text((x, y), text, font=fnt, fill=fill)
        return
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking


def with_glow(layer, radius, strength):
    """White text layer (L) -> text + soft halo, like the reference cards."""
    glow = layer.filter(ImageFilter.GaussianBlur(radius)).point(lambda v: int(v * strength))
    return Image.fromarray(
        __import__("numpy").maximum(__import__("numpy").asarray(layer), __import__("numpy").asarray(glow)))


def centered_line(text, fnt, tracking=0, y_center=H / 2, fill=242):
    layer = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(layer)
    tw = text_width(d, text, fnt, tracking)
    asc, desc = fnt.getmetrics()
    bbox = d.textbbox((0, 0), text, font=fnt)
    th = bbox[3] - bbox[1]
    draw_text(d, ((W - tw) / 2, y_center - th / 2 - bbox[1]), text, fnt, fill, tracking)
    return layer


def copy_card(text, fonts):
    layer = centered_line(text, fonts["copy"], tracking=0, fill=240)
    return with_glow(layer, 7, 0.45)


def product_card(name, sub, fonts):
    big = centered_line(name, fonts["serif"], tracking=34, y_center=H / 2 - 18, fill=246)
    small = centered_line(sub.upper(), fonts["small"], tracking=10, y_center=H / 2 + 92, fill=170)
    import numpy as np
    out = np.maximum(np.asarray(big), np.asarray(small))
    return with_glow(Image.fromarray(out), 5, 0.25)


def brand_card(name, fonts):
    layer = centered_line(name, fonts["brand"], tracking=2, fill=248)
    return with_glow(layer, 5, 0.2)


def main():
    font_dir = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "titles")
    os.makedirs(out_dir, exist_ok=True)
    cfg = json.load(open(os.path.join(HERE, "copy.json"), encoding="utf-8"))
    fonts = {
        "copy": font(font_dir, "Pretendard-SemiBold.otf", 64),
        "small": font(font_dir, "Pretendard-Light.otf", 26),
        "serif": font(font_dir, "BodoniModa-400.ttf", 168),
        "brand": font(font_dir, "Montserrat-800.ttf", 150),
    }
    made = []
    for c in cfg["cards"]:
        img = copy_card(c["text"], fonts)
        p = os.path.join(out_dir, "MELT2_%s.png" % c["id"])
        img.save(p, optimize=True)
        made.append(p)
    p = os.path.join(out_dir, "MELT2_%s.png" % cfg["product"]["id"])
    product_card(cfg["product"]["name"], cfg["product"]["sub"], fonts).save(p, optimize=True)
    made.append(p)
    p = os.path.join(out_dir, "MELT2_%s.png" % cfg["brand"]["id"])
    brand_card(cfg["brand"]["name"], fonts).save(p, optimize=True)
    made.append(p)
    for m in made:
        print(m, os.path.getsize(m))


if __name__ == "__main__":
    main()
