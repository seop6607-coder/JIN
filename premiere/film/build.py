"""
Build the single self-contained scripts the user runs in Premiere Pro:

  premiere/MELT2_BrandFilm.jsx
      film_head.js                     header, CONFIG, MOTIONS
    + PremiumEdit.jsx @@SHARED region  tested engine (placement, black-edge protection, keyframes, audio fades)
    + title card PNGs as base64        written to <project folder>/MELT2_titles at run time
    + film_main.js                     brand-film structure, source picking, main()

  premiere/FRAME_Film.jsx
      frame_head.js                    header, CONFIG, MOTIONS
    + PremiumEdit.jsx @@SHARED region
    + frame_scenes.json as SCENES/MUSIC, slate PNGs as base64 (written to <project folder>/FRAME_slates when needed)
    + frame_main.js                    scene matching, beat grid, music splice, markers, main()

    python3 premiere/film/build.py [melt|frame]      (no argument = both)
Re-run make_titles.py first if copy.json changed, make_slates.py if scene names changed.
"""
import base64
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def read(p):
    with open(p, encoding="utf-8-sig") as f:
        return f.read()


def shared_engine():
    engine = read(os.path.join(ROOT, "PremiumEdit.jsx"))
    a = engine.index("    // @@SHARED-BEGIN")
    b = engine.index("    // @@SHARED-END")
    shared = engine[a:b]
    return shared.split("\n", 1)[1]  # drop the marker line itself


def b64_lines(path):
    data = base64.b64encode(open(path, "rb").read()).decode("ascii")
    lines = [data[i:i + 120] for i in range(0, len(data), 120)]
    return '"%s"' % '" +\n            "'.join(lines)


def write(name, out):
    dst = os.path.join(ROOT, name)
    with open(dst, "w", encoding="utf-8-sig", newline="\n") as f:
        f.write(out)
    print("wrote", dst, len(out), "chars")


def build_melt(shared):
    copy = json.load(open(os.path.join(HERE, "copy.json"), encoding="utf-8"))
    names = [c["id"] for c in copy["cards"]] + [copy["product"]["id"], copy["brand"]["id"]]
    assets = []
    for n in names:
        fn = "MELT2_%s.png" % n
        assets.append('        "%s":\n            %s' % (fn, b64_lines(os.path.join(HERE, "titles", fn))))
    summary = " / ".join(c["text"] for c in copy["cards"]) + " / " + copy["product"]["name"] + " " + copy["product"]["sub"]
    asset_js = (
        "    // =====================================================================\n"
        "    //  문구 카드 이미지 (film/make_titles.py로 생성, film/copy.json 문구)\n"
        "    // =====================================================================\n"
        "    var COPY_SUMMARY = %s;\n"
        "    var ASSETS = {\n%s\n    };\n" % (json.dumps(summary, ensure_ascii=False), ",\n".join(assets))
    )
    write("MELT2_BrandFilm.jsx", read(os.path.join(HERE, "film_head.js")) + shared + asset_js + read(os.path.join(HERE, "film_main.js")))


def build_frame(shared):
    cfg = json.load(open(os.path.join(HERE, "frame_scenes.json"), encoding="utf-8"))
    scenes = []
    for sc in cfg["scenes"]:
        scenes.append("        " + json.dumps(sc, ensure_ascii=False))
    slates = []
    for sc in cfg["scenes"]:
        fn = os.path.join(HERE, "slates", "FRAME_slate_%s.png" % sc["id"])
        slates.append('        "%s":\n            %s' % (sc["id"], b64_lines(fn)))
    data_js = (
        "    // =====================================================================\n"
        "    //  30초 콘티 (film/frame_scenes.json) / 자리표시 카드 (film/make_slates.py)\n"
        "    // =====================================================================\n"
        "    var MUSIC = %s;\n"
        "    var SCENES = [\n%s\n    ];\n"
        "    var SLATES = {\n%s\n    };\n"
        % (json.dumps(cfg["music"]), ",\n".join(scenes), ",\n".join(slates))
    )
    write("FRAME_Film.jsx", read(os.path.join(HERE, "frame_head.js")) + shared + data_js + read(os.path.join(HERE, "frame_main.js")))


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    shared = shared_engine()
    if which in ("all", "melt"):
        build_melt(shared)
    if which in ("all", "frame"):
        build_frame(shared)


if __name__ == "__main__":
    main()
