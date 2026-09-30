"""
Render the FRAME film's stand-in slates (1920x1080): scene number + scene name on dark grey.
FRAME_Film.jsx puts a slate in a slot only when no footage for that scene is found, so the
cut still lands on the beat and the editor sees which shot is missing. Scene names come from
frame_scenes.json next to this file.

    python3 premiere/film/make_slates.py FONT_DIR [OUT_DIR]

FONT_DIR must contain Pretendard-SemiBold.otf, Pretendard-Medium.otf and Pretendard-Light.otf
(SIL Open Font License, npm: pretendard).
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
HERE = os.path.dirname(os.path.abspath(__file__))
BG = (38, 38, 40)


def centered(draw, y_center, text, fnt, fill):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((W - tw) / 2 - bbox[0], y_center - th / 2 - bbox[1]), text, font=fnt, fill=fill)


def slate(scene, fonts):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([48, 48, W - 49, H - 49], outline=(70, 70, 74), width=2)
    centered(d, H / 2 - 150, "%02d" % scene["no"], fonts["no"], (120, 120, 126))
    centered(d, H / 2 + 10, scene["name"], fonts["name"], (232, 232, 234))
    centered(d, H / 2 + 150, "촬영본 없음 · 이 자리에 %s 클립을 넣으세요" % scene["name"], fonts["note"], (140, 140, 146))
    return img.quantize(colors=48, method=Image.Quantize.MEDIANCUT)


def main():
    font_dir = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "slates")
    os.makedirs(out_dir, exist_ok=True)
    cfg = json.load(open(os.path.join(HERE, "frame_scenes.json"), encoding="utf-8"))
    fonts = {
        "no": ImageFont.truetype(os.path.join(font_dir, "Pretendard-SemiBold.otf"), 120),
        "name": ImageFont.truetype(os.path.join(font_dir, "Pretendard-Medium.otf"), 92),
        "note": ImageFont.truetype(os.path.join(font_dir, "Pretendard-Light.otf"), 34),
    }
    for sc in cfg["scenes"]:
        p = os.path.join(out_dir, "FRAME_slate_%s.png" % sc["id"])
        slate(sc, fonts).save(p, optimize=True)
        print(p, os.path.getsize(p))


if __name__ == "__main__":
    main()
