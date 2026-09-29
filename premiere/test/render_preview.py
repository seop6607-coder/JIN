"""
Render a motion preview (placeholder footage) from the keyframes the script produced in the mock run.

    node premiere/test/run_test.js --dump=/tmp/dump.json
    python3 premiere/test/render_preview.py /tmp/dump.json preview.mp4 [--sheet sheet.png]

Requires: pip install pillow numpy imageio-ffmpeg
Stills larger than the frame at 100% are drawn as "Scale to Frame Size" (fit), which is how
Premiere usually shows them and what the script conservatively assumes.
"""
import json
import math
import subprocess
import sys

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

OUT_W = 960
PALETTE = [
    ((24, 32, 48), (182, 142, 88)),
    ((18, 38, 36), (120, 170, 150)),
    ((44, 26, 30), (214, 160, 140)),
    ((20, 24, 40), (120, 140, 210)),
    ((36, 36, 30), (220, 200, 150)),
    ((30, 22, 44), (170, 130, 200)),
    ((16, 34, 44), (110, 180, 200)),
    ((40, 30, 20), (230, 170, 100)),
]


def font(size):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def placeholder(idx, name, w, h, k):
    """Graded 'footage' card with a grid so motion is visible."""
    W, H = max(8, int(w * k)), max(8, int(h * k))
    a, b = PALETTE[idx % len(PALETTE)]
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(0, W):
            u = x / W * 0.6 + y / H * 0.4
            v = 0.5 + 0.5 * math.sin(x / W * 3.1 + y / H * 1.7 + idx)
            t = max(0.0, min(1.0, u * 0.7 + v * 0.3))
            px[x, y] = tuple(int(a[c] + (b[c] - a[c]) * t) for c in range(3))
    d = ImageDraw.Draw(img, "RGBA")
    step = max(12, int(min(W, H) / 9))
    for x in range(0, W, step):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 28), width=1)
    for y in range(0, H, step):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 28), width=1)
    d.ellipse([W * 0.5 - H * 0.18, H * 0.32, W * 0.5 + H * 0.18, H * 0.68], outline=(255, 255, 255, 120), width=max(2, int(H / 180)))
    f = font(max(14, int(H / 7)))
    label = f"{idx + 1:02d}"
    tw = d.textlength(label, font=f)
    d.text(((W - tw) / 2, H * 0.40), label, font=f, fill=(255, 255, 255, 230))
    f2 = font(max(10, int(H / 22)))
    d.text((W * 0.05, H * 0.88), name, font=f2, fill=(255, 255, 255, 170))
    return img.convert("RGBA")


def interp(keys, static, f):
    if not keys:
        return static
    if f <= keys[0][0]:
        return keys[0][1]
    if f >= keys[-1][0]:
        return keys[-1][1]
    for (fa, va), (fb, vb) in zip(keys, keys[1:]):
        if fa <= f <= fb:
            u = (f - fa) / (fb - fa) if fb > fa else 0
            if isinstance(va, list):
                return [p + (q - p) * u for p, q in zip(va, vb)]
            return va + (vb - va) * u
    return keys[-1][1]


def main():
    dump, out = sys.argv[1], sys.argv[2]
    sheet = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
    data = json.load(open(dump))
    W, H, fps, frames = data["W"], data["H"], data["fps"], data["frames"]
    k = OUT_W / W
    OW, OH = OUT_W, int(round(H * k))
    clips = data["clips"]
    imgs = []
    for i, c in enumerate(clips):
        w, h = c["w"], c["h"]
        fit = 1.0
        if c["still"] and (w > W or h > H):
            fit = min(W / w, H / h)
        imgs.append((placeholder(i, c["name"], w * fit, h * fit, k), fit))

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    proc = subprocess.Popen([ff, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}", "-r", str(fps),
                             "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", out],
                            stdin=subprocess.PIPE)
    thumbs = []
    order = sorted(range(len(clips)), key=lambda i: clips[i]["track"])
    for f in range(frames):
        canvas = Image.new("RGBA", (OW, OH), (0, 0, 0, 255))
        for i in order:
            c = clips[i]
            if not (c["startF"] <= f < c["endF"]):
                continue
            lf = f - c["startF"]
            img, fit = imgs[i]
            pos = interp(c["pos"], c["staticPos"], lf)
            sc = interp(c["scale"], c["staticScale"], lf) / 100.0 / fit * fit  # scale applies to fitted size
            rot = math.radians(interp(c["rot"], c["staticRot"], lf))
            op = interp(c["op"], c["staticOp"], lf) / 100.0
            px, py = pos[0] * OW, pos[1] * OH
            iw, ih = img.size
            cs, sn = math.cos(rot), math.sin(rot)
            s = sc
            a, b = cs / s, sn / s
            d, e = -sn / s, cs / s
            coeffs = (a, b, iw / 2 - (a * px + b * py), d, e, ih / 2 - (d * px + e * py))
            layer = img.transform((OW, OH), Image.AFFINE, coeffs, resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0))
            if op < 0.999:
                alpha = layer.getchannel("A").point(lambda v: int(v * op))
                layer.putalpha(alpha)
            canvas = Image.alpha_composite(canvas, layer)
        rgb = canvas.convert("RGB")
        proc.stdin.write(rgb.tobytes())
        if sheet and f % max(1, frames // 24) == 0:
            thumbs.append((f, rgb.resize((OW // 3, OH // 3))))
    proc.stdin.close()
    proc.wait()
    if sheet and thumbs:
        cols = 6
        rows = math.ceil(len(thumbs) / cols)
        tw, th = thumbs[0][1].size
        sh = Image.new("RGB", (cols * tw, rows * (th + 16)), (20, 20, 20))
        dr = ImageDraw.Draw(sh)
        for n, (f, t) in enumerate(thumbs):
            x, y = (n % cols) * tw, (n // cols) * (th + 16)
            sh.paste(t, (x, y + 16))
            dr.text((x + 4, y + 2), f"{f / fps:5.2f}s", fill=(220, 220, 220), font=font(11))
        sh.save(sheet)
    print("wrote", out)


if __name__ == "__main__":
    main()
