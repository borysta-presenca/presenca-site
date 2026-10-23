#!/usr/bin/env python3
"""Draws the network texture behind the navy sections (catalogue pieces PD1 and PD2): points, and lines
between near neighbours that fade with distance, in the blue to green of the brand.
Run: python3 tools/rede.py  (writes assets/img/rede.svg)
"""
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, N, R = 1200, 900, 72, 190

rnd = random.Random(20261023)
pts = [(rnd.uniform(0, W), rnd.uniform(0, H)) for _ in range(N)]
lines, dots = [], []
for i, (x1, y1) in enumerate(pts):
    for x2, y2 in pts[i + 1:]:
        d = ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5
        if d < R:
            lines.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke-opacity="{(1 - d / R) * 0.6:.2f}"/>')
    dots.append(f'<circle cx="{x1:.0f}" cy="{y1:.0f}" r="{rnd.choice((2, 2.5, 3.5))}"/>')

svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">'
    f'<defs><linearGradient id="r" gradientUnits="userSpaceOnUse" x1="0" y1="{H}" x2="{W}" y2="0">'
    '<stop offset="0" stop-color="#2B88B3"/><stop offset="1" stop-color="#39C526"/></linearGradient></defs>'
    f'<g stroke="url(#r)" stroke-width="1.2">{"".join(lines)}</g><g fill="url(#r)">{"".join(dots)}</g></svg>'
)
with open(os.path.join(os.path.dirname(HERE), "assets", "img", "rede.svg"), "w") as f:
    f.write(svg)
print("rede.svg", len(lines), "lines")
