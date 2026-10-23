#!/usr/bin/env python3
"""Cuts and grades the photographs of the page from the Presença picture pool (Pexels licence).

Source: the pool in the Borysta work folder (Bildwelt/Originale), register Presenca_Bildquellen.txt.
Recipe: grade() from the Borysta template system (cool blue, less contrast, lifted shadows, grain).
The hero portrait is freed from its background with the Vision framework of macOS (tools/cutout.swift,
compiled on the fly with swiftc) and saved as WebP with transparency.
Run: python3 tools/photos.py [target ...]  (writes assets/img/, only the named targets when given)
"""
import os
import subprocess
import sys
import tempfile
from PIL import Image, ImageEnhance
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
POOL = os.path.expanduser("~/Desktop/Claude/Borysta AI Agency/09 — Operations & Projects/09.e) - Presenca/07 - Marketing/Bildwelt/Originale")
POOL_B = os.path.expanduser("~/Desktop/Claude/Borysta AI Agency/06 — Marketing & Sales/06.a) - Marketing/2 - Templates/Bildwelt/Originale")
OUT = os.path.join(ROOT, "assets", "img")

# file, target, size (w, h), focus (px, py in 0..1)
CUTS = [
    # the crossfade beside the intro: four worlds in one framing, 4:5
    ("pexels_19879741.jpg", "mundo-dentista.jpg", (960, 1200), (0.5, 0.35)),
    ("pexels_7578806.jpg", "mundo-clinica.jpg", (960, 1200), (0.5, 0.3)),
    ("pexels_6235124.jpg", "mundo-veterinario.jpg", (960, 1200), (0.62, 0.5)),
    ("pexels_32351055.jpg", "mundo-salao.jpg", (960, 1200), (0.5, 0.3)),
    # the round marks of the list, 96 px
    ("pexels_6627325.jpg", "marca-dentistas.jpg", (96, 96), (0.68, 0.3)),
    ("pexels_5215012.jpg", "marca-clinicas.jpg", (96, 96), (0.45, 0.35)),
    ("pexels_7345476.jpg", "marca-fisioterapia.jpg", (96, 96), (0.5, 0.4)),
    ("pexels_18459702.jpg", "marca-cuidadores.jpg", (96, 96), (0.72, 0.4)),
    ("pexels_6234612.jpg", "marca-veterinarios.jpg", (96, 96), (0.4, 0.5)),
    ("pexels_7697445.jpg", "marca-saloes.jpg", (96, 96), (0.4, 0.4)),
    # round 2: the segment cards reuse the four worlds above and add the carers
    ("pexels_7345476.jpg", "mundo-cuidadores.jpg", (960, 1200), (0.5, 0.4)),
    ("pexels_8313224.jpg", "sobre.jpg", (1000, 1080), (0.5, 0.4)),
    ("pexels_6627325.jpg", "faixa.jpg", (1920, 820), (0.5, 0.4)),
    ("pexels_4269206.jpg", "recepcao.jpg", (900, 1100), (0.5, 0.45)),
    (os.path.join(POOL_B, "pexels_5355850.jpg"), "equipe-tablet.jpg", (900, 1100), (0.5, 0.35)),
]

# the hero portrait: file, target, widths
HERO = ("pexels_19957222.jpg", "medica", (1400, 760))


def grade(im):
    im = im.convert("RGB")
    im = ImageEnhance.Contrast(im).enhance(0.86)
    im = ImageEnhance.Color(im).enhance(0.72)
    a = np.asarray(im).astype(np.float32)
    lum = a.mean(axis=2, keepdims=True) / 255.0
    a = a + (1 - lum) * 14
    a[..., 0] -= 8
    a[..., 2] += 10
    hi = np.clip((lum - 0.55) / 0.45, 0, 1)
    a[..., 1] += hi[..., 0] * 6
    a[..., 2] += hi[..., 0] * 10
    wh = np.clip((lum - 0.9) / 0.1, 0, 1)[..., 0]
    a = a * (1 - wh[..., None]) + np.clip(a, 0, 255).mean(axis=2, keepdims=True) * wh[..., None]
    a += np.random.default_rng(20260810).normal(0, 2.2, a.shape[:2])[..., None]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def cut(im, w, h, px, py):
    iw, ih = im.size
    scale = max(w / iw, h / ih)
    nw, nh = int(round(iw * scale)), int(round(ih * scale))
    im = im.resize((nw, nh), Image.LANCZOS)
    x0 = int((nw - w) * px)
    y0 = int((nh - h) * py)
    return im.crop((x0, y0, x0 + w, y0 + h))


def cutout(path):
    tmp = tempfile.mkdtemp()
    exe, png = os.path.join(tmp, "cutout"), os.path.join(tmp, "cut.png")
    subprocess.run(["swiftc", "-O", os.path.join(HERE, "cutout.swift"), "-o", exe], check=True)
    subprocess.run([exe, path, png], check=True)
    im = Image.open(png).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:]
    if not only or HERO[1] in only:
        im = cutout(os.path.join(POOL, HERO[0]))
        for w in HERO[2]:
            sized = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            out = grade(sized)
            out.putalpha(sized.getchannel("A"))
            out.save(os.path.join(OUT, f"{HERO[1]}-{w}.webp"), quality=86, method=6)
            print("cut", f"{HERO[1]}-{w}.webp")
    for src, dst, (w, h), (px, py) in CUTS:
        if only and dst not in only:
            continue
        im = Image.open(os.path.join(POOL, src))
        grade(cut(im, w, h, px, py)).save(os.path.join(OUT, dst), quality=82, subsampling=0, optimize=True)
        print("cut", dst)
