from PIL import Image, ImageDraw, ImageFont
import os

src = Image.open("newlogo-crop.png").convert("RGBA")
print("src", src.size)

def save_resize(img, size, path):
    out = img.resize((size, size), Image.LANCZOS)
    out.save(path, "PNG", optimize=True)
    print(path, out.size, os.path.getsize(path))

save_resize(src, 512, "assets/logo.png")
save_resize(src, 192, "assets/logo-192.png")
save_resize(src, 32, "assets/favicon-32x32.png")
save_resize(src, 16, "assets/favicon-16x16.png")

ico = src.resize((48, 48), Image.LANCZOS)
ico.save("assets/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("assets/favicon.ico", os.path.getsize("assets/favicon.ico"))

bg = Image.new("RGBA", (180, 180), (10, 10, 12, 255))
logo = src.resize((150, 150), Image.LANCZOS)
bg.alpha_composite(logo, (15, 15))
bg.convert("RGB").save("assets/apple-touch-icon.png", "PNG", optimize=True)
print("assets/apple-touch-icon.png", os.path.getsize("assets/apple-touch-icon.png"))

W, H = 1200, 630
og = Image.new("RGB", (W, H), (7, 9, 13))
draw = ImageDraw.Draw(og)
# grid halus ala landing baru
for x in range(0, W, 44):
    draw.line([(x, 0), (x, H)], fill=(22, 28, 38))
for y in range(0, H, 44):
    draw.line([(0, y), (W, y)], fill=(22, 28, 38))
# glow biru di belakang logo
draw.ellipse([20, 40, 560, 590], fill=(14, 22, 36))
lg = src.resize((380, 380), Image.LANCZOS)
og.paste(lg, (110, (H - 380) // 2), lg)
try:
    f_title = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 130)
    f_sub = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 44)
    f_small = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 32)
except Exception as e:
    print("font fail", e)
    f_title = f_sub = f_small = ImageFont.load_default()
draw.text((560, 170), "Musa", font=f_title, fill=(238, 242, 246))
draw.text((562, 330), "Dynamic Island", font=f_sub, fill=(154, 166, 181))
draw.text((562, 385), "untuk Desktop.", font=f_sub, fill=(154, 166, 181))
draw.text((562, 465), "Windows \u00b7 macOS ARM \u00b7 Linux", font=f_small, fill=(94, 177, 255))
# aksen gradasi biru logo -> cyan
for i in range(158):
    t = i / 157
    r = round(94 + (77 - 94) * t)
    g = round(177 + (227 - 177) * t)
    b = round(255 + (194 - 255) * t)
    draw.line([(562 + i, 520), (562 + i, 528)], fill=(r, g, b))
og.save("assets/og-image.png", "PNG", optimize=True)
print("assets/og-image.png", os.path.getsize("assets/og-image.png"))
