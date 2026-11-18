#!/usr/bin/env python3
"""Generate the committed extension icons. Requires Pillow."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public"
SIZES = (16, 32, 48, 96, 128)
CANVAS = 1024


def generate_icon(size: int) -> None:
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        (48, 48, CANVAS - 48, CANVAS - 48),
        radius=220,
        fill="#e53935",
    )

    white = "#ffffff"
    line_width = 64
    corner_length = 225
    inset = 235

    # Four focus-frame corners.
    draw.line((inset, inset, inset + corner_length, inset), fill=white, width=line_width)
    draw.line((inset, inset, inset, inset + corner_length), fill=white, width=line_width)
    draw.line(
        (CANVAS - inset, inset, CANVAS - inset - corner_length, inset),
        fill=white,
        width=line_width,
    )
    draw.line(
        (CANVAS - inset, inset, CANVAS - inset, inset + corner_length),
        fill=white,
        width=line_width,
    )
    draw.line(
        (inset, CANVAS - inset, inset + corner_length, CANVAS - inset),
        fill=white,
        width=line_width,
    )
    draw.line(
        (inset, CANVAS - inset, inset, CANVAS - inset - corner_length),
        fill=white,
        width=line_width,
    )
    draw.line(
        (
            CANVAS - inset,
            CANVAS - inset,
            CANVAS - inset - corner_length,
            CANVAS - inset,
        ),
        fill=white,
        width=line_width,
    )
    draw.line(
        (
            CANVAS - inset,
            CANVAS - inset,
            CANVAS - inset,
            CANVAS - inset - corner_length,
        ),
        fill=white,
        width=line_width,
    )

    # Center target.
    center = CANVAS // 2
    radius = 105
    draw.ellipse(
        (center - radius, center - radius, center + radius, center + radius),
        outline=white,
        width=line_width,
    )

    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(OUTPUT / f"icon-{size}.png", optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        generate_icon(size)


if __name__ == "__main__":
    main()
