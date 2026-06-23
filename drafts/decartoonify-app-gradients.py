#!/usr/bin/env python3
"""Pass 2 gradient flatten for the rest of the Co-Exist app.

Rules, in order, over every non-admin tsx:
  1. Off-brand colour normalise: amber -> bark, emerald -> primary, red -> error
     (token-level, e.g. from-amber-500 -> from-bark-500, text-amber-600 ->
     text-bark-600). bark/primary/error all have full 50..900 scales.
  2. Flatten any REAL multi-stop decorative gradient (one that has a `to-<colour>`
     endpoint) to a single solid = its last colour stop, dropping /opacity.
  3. LEAVE untouched: image-legibility overlays / scrims (any stop is
     black/white/transparent/surface-0), and single-colour fades (from-X with no
     to-, e.g. a soft wash that fades to transparent) - those are not the puffy
     3D tiles Tate is removing.
"""
import re, subprocess, collections

files = subprocess.check_output(
    "find src -name '*.tsx' -not -path '*/admin/*' -not -name 'admin-*.tsx'",
    shell=True, text=True, cwd='/Users/ecodia/.code/coexist').split()

COLOR_REMAP = {'amber': 'bark', 'emerald': 'primary', 'red': 'error'}
GRAD = re.compile(
    r'bg-gradient-to-[a-z]+((?:\s+(?:from|via|to)-[a-z]+-[0-9]+(?:/[0-9]+)?)+)')
STOP = re.compile(r'(from|via|to)-([a-z]+)-([0-9]+)(?:/[0-9]+)?')
KEEP = ('black', 'white', 'transparent', 'surface-0')

def remap_colors(text):
    for bad, good in COLOR_REMAP.items():
        text = re.sub(rf'(from|via|to|bg|text|border|ring|fill|divide|outline)-{bad}-',
                      rf'\1-{good}-', text)
    return text

def flatten(text):
    def repl(m):
        whole = m.group(0)
        stops = STOP.findall(m.group(1))
        colors = [f'{c}-{s}' for (_pos, c, s) in stops]
        if any(k in whole for k in KEEP):
            return whole  # image overlay / scrim
        tos = [(c, s) for (pos, c, s) in stops if pos == 'to']
        if not tos:
            return whole  # single-colour fade, leave it
        c, s = tos[-1]
        return f'bg-{c}-{s}'
    return GRAD.sub(repl, text)

changed = 0
log = collections.Counter()
for f in files:
    src = open(f, encoding='utf-8', errors='ignore').read()
    out = flatten(remap_colors(src))
    if out != src:
        open(f, 'w', encoding='utf-8').write(out)
        changed += 1
print(f'changed {changed} files')
