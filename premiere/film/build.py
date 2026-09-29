"""
Build premiere/MELT2_BrandFilm.jsx (single self-contained file for the user):

    film_head.js                     header, CONFIG, MOTIONS
  + PremiumEdit.jsx @@SHARED region  tested engine (placement, black-edge protection, keyframes, audio fades)
  + title card PNGs as base64        written to <project folder>/MELT2_titles at run time
  + film_main.js                     brand-film structure, source picking, main()

    python3 premiere/film/build.py
Re-run make_titles.py first if copy.json changed.
"""
import base64
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def read(p):
    with open(p, encoding="utf-8-sig") as f:
        return f.read()


def main():
    engine = read(os.path.join(ROOT, "PremiumEdit.jsx"))
    a = engine.index("    // @@SHARED-BEGIN")
    b = engine.index("    // @@SHARED-END")
    shared = engine[a:b]
    shared = shared.split("\n", 1)[1]  # drop the marker line itself

    copy = json.load(open(os.path.join(HERE, "copy.json"), encoding="utf-8"))
    names = [c["id"] for c in copy["cards"]] + [copy["product"]["id"], copy["brand"]["id"]]
    assets = []
    for n in names:
        fn = "MELT2_%s.png" % n
        data = base64.b64encode(open(os.path.join(HERE, "titles", fn), "rb").read()).decode("ascii")
        lines = [data[i:i + 120] for i in range(0, len(data), 120)]
        assets.append('        "%s":\n            "%s"' % (fn, '" +\n            "'.join(lines)))
    summary = " / ".join(c["text"] for c in copy["cards"]) + " / " + copy["product"]["name"] + " " + copy["product"]["sub"]
    asset_js = (
        "    // =====================================================================\n"
        "    //  문구 카드 이미지 (film/make_titles.py로 생성, film/copy.json 문구)\n"
        "    // =====================================================================\n"
        "    var COPY_SUMMARY = %s;\n"
        "    var ASSETS = {\n%s\n    };\n" % (json.dumps(summary, ensure_ascii=False), ",\n".join(assets))
    )

    out = read(os.path.join(HERE, "film_head.js")) + shared + asset_js + read(os.path.join(HERE, "film_main.js"))
    dst = os.path.join(ROOT, "MELT2_BrandFilm.jsx")
    with open(dst, "w", encoding="utf-8-sig", newline="\n") as f:
        f.write(out)
    print("wrote", dst, len(out), "chars")


if __name__ == "__main__":
    main()
