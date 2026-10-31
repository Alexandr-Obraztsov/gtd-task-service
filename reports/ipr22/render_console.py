# -*- coding: utf-8 -*-
"""Рисует картинку «окно терминала» из РЕАЛЬНОГО текстового вывода команды.

Использование: render_console.py вход.txt выход.png "Заголовок" [первая_строка последняя_строка] [--numbers]
Текст не редактируется: строки только обрезаются по ширине окна.
"""
import sys

from PIL import Image, ImageDraw, ImageFont

MONO = "/System/Library/Fonts/Menlo.ttc"
SANS = "/System/Library/Fonts/Helvetica.ttc"
SIZE = 22
PAD = 24
MAX_COLS = 112
BAR = 44


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    numbers = "--numbers" in sys.argv
    src, dst, title = args[0], args[1], args[2]
    lines = open(src, encoding="utf-8").read().rstrip("\n").split("\n")
    first = int(args[3]) if len(args) > 3 else 1
    last = int(args[4]) if len(args) > 4 else len(lines)
    chunk = lines[first - 1:last]
    if numbers:
        chunk = [f"{first + i:3d}  {t}" for i, t in enumerate(chunk)]
    chunk = [t.expandtabs(4)[:MAX_COLS] for t in chunk]

    font = ImageFont.truetype(MONO, SIZE)
    bold = ImageFont.truetype(SANS, 20)
    cw = font.getlength("M")
    lh = int(SIZE * 1.45)
    width = int(PAD * 2 + cw * min(MAX_COLS, max(len(t) for t in chunk)) + 10)
    width = max(width, 900)
    height = BAR + PAD + lh * len(chunk) + PAD

    img = Image.new("RGB", (width, height), (24, 27, 33))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, width, BAR], fill=(52, 57, 66))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([16 + i * 26, 14, 32 + i * 26, 30], fill=c)
    d.text((width // 2, BAR // 2), title, font=bold, fill=(220, 224, 230), anchor="mm")

    y = BAR + PAD
    for text in chunk:
        color = (230, 232, 236)
        body = text.lstrip("0123456789 ") if numbers else text
        if body.startswith("$"):
            color = (126, 231, 135)
        elif "✓" in text or "PASS" in text or "healthy" in text or "passed" in text:
            color = (126, 231, 135)
        elif "warn" in text.split()[:3] or "401" in text and "status" in text:
            color = (240, 200, 110)
        elif " error " in text or "FAIL" in text or "Error" in text[:12]:
            color = (255, 123, 114)
        elif body.startswith("#") and not numbers:
            color = (150, 160, 175)
        d.text((PAD, y), text, font=font, fill=color)
        y += lh
    img.save(dst)
    print(dst, img.size)


main()
