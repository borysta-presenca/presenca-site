#!/usr/bin/env python3
"""Cuts and grades the photographs of the page from the Presença picture pool (Pexels licence).

Source: the pool in the Borysta work folder (Bildwelt/Originale), register Presenca_Bildquellen.txt.
Recipe: grade() from the Borysta template system (cool blue, less contrast, lifted shadows, grain).
Run: python3 tools/photos.py  (writes assets/img/)
"""
import os
from PIL import Image, ImageEnhance
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
POOL = os.path.expanduser("~/Desktop/Claude/Borysta AI Agency/09 — Operations & Projects/09.e) - Presenca/07 - Marketing/Bildwelt/Originale")
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
]


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


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for src, dst, (w, h), (px, py) in CUTS:
        im = Image.open(os.path.join(POOL, src))
        grade(cut(im, w, h, px, py)).save(os.path.join(OUT, dst), quality=82, subsampling=0, optimize=True)
        print("cut", dst)
