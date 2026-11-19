import os, random, math, io
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import cairosvg

K = '/home/claude/kit'
OUT = K + '/out'
STK = K + '/stk'
LS = '/home/claude/rapid/marketing/lifestyle-hd'
ANTON = K + '/fonts/Anton.ttf'
INTER_B = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
INTER_SB = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
G, GD, O, PAPER = (0, 117, 61), (0, 75, 39), (255, 154, 60), (244, 242, 236)
DARK = (8, 30, 19)

STICKERS = ['anti-viola', 'forza-rapid-block', 'wien-west-huetteldorf', 'derbysieger-schal', 'weststadion',
            'ynwa', 'block-west', 'rapid-wien-schal', 'scr-1899', 'wien-gruen-weiss', '1140-huetteldorf',
            'forza-rapid-spray', 'wien-west-steffl', 'auswaerts', 'wien-gehoert-uns', 'rapid-wien-fan-szene',
            'wien-west-huetteldorf-schal', 'gegen-modernen-fussball', 'antiviola-schwein', 'wien-ein-leben-lang',
            'forza-rapid-schal', 'wien-west-block', 'anti-violett', 'wien-meine-heimat']
PHOTOS = {  # nur geprüfte, makellose Fotos
    'derby': 'derbysieger-sticker-bim-haltestelle.jpg',
    'fanszene': 'rapid-wien-fan-szene-sticker-huetteldorf.jpg',
    'christkindl': 'wien-west-huetteldorf-sticker-christkindlmarkt.jpg',
    'steffl': 'wien-west-steffl-sticker-kahlenberg_7ad44460-8906-41a1-bea4-6a70bbfd3a46.jpg',
    'kaffeehaus': 'anti-violett-sticker-kaffeehaus.jpg',
    'spray': 'forza-rapid-spray-sticker-unterfuehrung.jpg',
}

_cache = {}
def stk(name):
    if name not in _cache:
        im = Image.open(f'{STK}/{name}.png').convert('RGBA')
        _cache[name] = im.crop(im.getbbox())
    return _cache[name]

def sticker(name, w, angle=0):
    im = stk(name)
    h = int(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    pad = int(w * 0.12)
    can = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    a = im.split()[3]
    sh = Image.new('RGBA', (w, h), (0, 0, 0, 150)); sh.putalpha(a.point(lambda v: v * 0.55))
    can.alpha_composite(sh, (pad + int(w * 0.012), pad + int(w * 0.025)))
    can = can.filter(ImageFilter.GaussianBlur(w * 0.018))
    can.alpha_composite(im, (pad, pad))
    return can.rotate(angle, resample=Image.BICUBIC, expand=True)

def bg(W, H):
    base = Image.new('RGB', (W, H), DARK)
    g = Image.radial_gradient('L').resize((W, H))
    g = ImageOps.invert(g)
    hi = Image.new('RGB', (W, H), GD)
    base = Image.composite(hi, base, g.point(lambda v: int(v * 0.8)))
    noise = Image.effect_noise((W, H), 18).convert('RGB')
    return Image.blend(base, noise, 0.04).convert('RGBA')

def wall(W, H, seed=1, scale=1.0, density=1.0):
    random.seed(seed)
    im = bg(W, H)
    sw = int(min(W, H) * 0.42 * scale) if W / H < 1.6 else int(H * 0.46 * scale)
    sw = max(sw, 160)
    names = STICKERS[:]
    random.shuffle(names)
    step_x, step_y = int(sw * 0.82 / density), int(sw * 0.6 / density)
    i = 0
    y = -int(sw * 0.2)
    row = 0
    while y < H:
        x = -int(sw * 0.3) + (row % 2) * step_x // 2
        while x < W:
            s = sticker(names[i % len(names)], int(sw * random.uniform(0.9, 1.05)), random.uniform(-9, 9))
            im.alpha_composite(s, (x + random.randint(-12, 12), y + random.randint(-10, 10)))
            i += 1
            x += step_x
        y += step_y; row += 1
    return im

def darken(im, box, alpha=200, radius=0, feather=60):
    W, H = im.size
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=alpha)
    m = m.filter(ImageFilter.GaussianBlur(feather))
    ov = Image.new('RGBA', (W, H), DARK + (255,)); ov.putalpha(m)
    im.alpha_composite(ov)

def font(p, s): return ImageFont.truetype(p, s)

def text_c(d, cx, y, t, f, fill):
    w = d.textlength(t, font=f); d.text((cx - w / 2, y), t, font=f, fill=fill); return f.getbbox(t)[3]

def logo_mark(size):
    png = cairosvg.svg2png(url='/home/claude/rapid/shopify-theme/assets/favicon.svg', output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert('RGBA')

def headline_block(im, cx, y, scale, sub=True, align='c', x=None, lines=('RAPID STICKER', 'AUS WIEN WEST')):
    d = ImageDraw.Draw(im)
    f1 = font(ANTON, int(110 * scale)); f3 = font(INTER_SB, int(30 * scale))
    yy = y
    for k, ln in enumerate(lines):
        col = (255, 255, 255) if k == 0 else (61, 220, 132)
        if align == 'c': text_c(d, cx, yy, ln, f1, col)
        else: d.text((x, yy), ln, font=f1, fill=col)
        yy += int(122 * scale)
    if sub:
        s = 'Premium-Vinyl · einzeln 3,50 € · im Mix bis −20 %'
        yy += int(34 * scale)
        if align == 'c': text_c(d, cx, yy, s, f3, (216, 232, 221))
        else: d.text((x, yy), s, font=f3, fill=(216, 232, 221))
        yy += int(46 * scale)
        pill(im, cx if align == 'c' else None, yy, 'wien-west.at', scale, x=x)
    return yy

def pill(im, cx, y, t, scale, x=None):
    d = ImageDraw.Draw(im)
    f = font(INTER_B, int(30 * scale))
    tw = d.textlength(t, font=f); pw, ph = tw + 56 * scale, 58 * scale
    x0 = cx - pw / 2 if cx is not None else x
    d.rounded_rectangle((x0, y, x0 + pw, y + ph), radius=ph / 2, fill=O)
    d.text((x0 + 28 * scale, y + 10 * scale), t, font=f, fill=(17, 17, 17))

def photo(key, W, H, focus=(0.5, 0.5)):
    im = Image.open(f'{LS}/{PHOTOS[key]}').convert('RGB')
    r = max(W / im.width, H / im.height)
    im = im.resize((math.ceil(im.width * r), math.ceil(im.height * r)), Image.LANCZOS)
    x = int((im.width - W) * focus[0]); y = int((im.height - H) * focus[1])
    return im.crop((x, y, x + W, y + H)).convert('RGBA')

def save(im, path, png=False):
    p = f'{OUT}/{path}'; os.makedirs(os.path.dirname(p), exist_ok=True)
    im = im.convert('RGB')
    if png: im.save(p, optimize=True)
    else: im.save(p, quality=92, optimize=True, progressive=True)
    print(path, im.size)

# ---------- Profilbild (Kreis-tauglich) ----------
def profile(S):
    im = Image.new('RGBA', (S, S), G + (255,))
    m = logo_mark(int(S * 0.86))
    im.alpha_composite(m, ((S - m.width) // 2, (S - m.height) // 2))
    return im

def logo_white(S):
    im = Image.new('RGBA', (S, S), (255, 255, 255, 255))
    m = logo_mark(int(S * 0.8))
    im.alpha_composite(m, ((S - m.width) // 2, (S - m.height) // 2))
    return im

# ---------- Titelbilder ----------
def cover(W, H, safe_w, safe_h, seed, scale, block_alpha=215, wall_scale=1.0, lines=('RAPID STICKER', 'AUS WIEN WEST')):
    im = wall(W, H, seed=seed, scale=wall_scale)
    cx = W // 2
    bw, bh = int(safe_w * 0.86), int(safe_h * 0.86)
    darken(im, (cx - bw // 2, H // 2 - bh // 2, cx + bw // 2, H // 2 + bh // 2), alpha=block_alpha, radius=40, feather=int(H * 0.06))
    total = int((122 * len(lines) + 34 + 46 + 58) * scale)
    headline_block(im, cx, H // 2 - total // 2 - int(10 * scale), scale, lines=lines)
    return im

def post_photo(W, H, key, focus, lines, sub, cta='wien-west.at', top_frac=0.68):
    im = Image.new('RGBA', (W, H), DARK + (255,))
    ph = photo(key, W, int(H * top_frac), focus)
    im.alpha_composite(ph, (0, 0))
    # Verlauf ins Dunkle
    g = Image.linear_gradient('L').resize((W, int(H * 0.18)))
    ov = Image.new('RGBA', g.size, DARK + (255,)); ov.putalpha(g)
    im.alpha_composite(ov, (0, int(H * top_frac) - g.height))
    d = ImageDraw.Draw(im)
    s = W / 1080
    y = int(H * top_frac) + int(10 * s)
    f1 = font(ANTON, int(92 * s))
    for k, ln in enumerate(lines):
        text_c(d, W // 2, y, ln, f1, (255, 255, 255) if k == 0 else (61, 220, 132)); y += int(104 * s)
    f3 = font(INTER_SB, int(32 * s))
    y += int(30 * s)
    text_c(d, W // 2, y, sub, f3, (216, 232, 221)); y += int(56 * s)
    pill(im, W // 2, y, cta, s)
    m = logo_mark(int(110 * s)); im.alpha_composite(m, (int(36 * s), int(36 * s)))
    return im

def story(W, H, key, focus):
    im = bg(W, H)
    s = W / 1080
    m = logo_mark(int(130 * s)); im.alpha_composite(m, ((W - m.width) // 2, int(250 * s)))
    # Foto-Karte 16:9
    cw = int(W * 0.9); ch = int(cw * 9 / 16)
    ph = photo(key, cw, ch, focus)
    mask = Image.new('L', (cw, ch), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw, ch), radius=int(36 * s), fill=255)
    ph.putalpha(mask)
    shadow = Image.new('RGBA', (cw + 80, ch + 80), (0, 0, 0, 0)); sm = Image.new('L', (cw, ch), 0); ImageDraw.Draw(sm).rounded_rectangle((0, 0, cw, ch), radius=36, fill=170)
    shadow.paste((0, 0, 0, 255), (40, 55), sm); shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    py = int(440 * s)
    im.alpha_composite(shadow, ((W - cw) // 2 - 40, py - 40)); im.alpha_composite(ph, ((W - cw) // 2, py))
    for nm, ang, dx in [('anti-viola', 7, -300), ('wien-west-huetteldorf', -2, 0), ('forza-rapid-block', -7, 300)]:
        st = sticker(nm, int(300 * s), ang)
        im.alpha_composite(st, (W // 2 + int(dx * s) - st.width // 2, py + ch - int(120 * s)))
    d = ImageDraw.Draw(im)
    y = py + ch + int(190 * s)
    f1 = font(ANTON, int(124 * s))
    for k, ln in enumerate(('RAPID STICKER', 'AUS WIEN WEST')):
        text_c(d, W // 2, y, ln, f1, (255, 255, 255) if k == 0 else (61, 220, 132)); y += int(138 * s)
    f3 = font(INTER_SB, int(38 * s)); y += int(34 * s)
    text_c(d, W // 2, y, 'Premium-Vinyl · 3,50 € · Mix bis −20 %', f3, (216, 232, 221)); y += int(84 * s)
    pill(im, W // 2, y, 'Link in Bio · wien-west.at', s * 1.15)
    return im

def highlight(W, H, label, stk_name):
    im = Image.new('RGBA', (W, H), GD + (255,))
    s = sticker(stk_name, int(W * 0.62), -6)
    im.alpha_composite(s, ((W - s.width) // 2, H // 2 - s.height // 2 - 60))
    d = ImageDraw.Draw(im)
    text_c(d, W // 2, H // 2 + s.height // 2 - 20, label, font(ANTON, 96), (255, 255, 255))
    return im

def sticker_grid(W, H, title=True, n=6, seed=3):
    im = bg(W, H)
    random.seed(seed)
    cols = 3
    rows = math.ceil(n / cols)
    top = int(H * 0.22) if title else int(H * 0.06)
    cw, rh = W / cols, (H - top - H * 0.06) / rows
    names = STICKERS[:n]
    for i, nm in enumerate(names):
        c, r = i % cols, i // cols
        s = sticker(nm, int(min(cw * 0.86, rh * 1.25)), random.uniform(-5, 5))
        im.alpha_composite(s, (int(c * cw + (cw - s.width) / 2), int(top + r * rh + (rh - s.height) / 2)))
    if title:
        d = ImageDraw.Draw(im); sc = W / 1200
        text_c(d, W // 2, int(H * 0.05), 'MOTIVE FREI MIXEN · BIS −20 %', font(ANTON, int(72 * sc)), (255, 255, 255))
    return im

# ================= AUSGABE =================
os.makedirs(OUT, exist_ok=True)
# Facebook
save(profile(720), 'facebook/fb-profilbild-720x720.png', True)
save(cover(1640, 624, 1110, 624, 11, 1.2, 230), 'facebook/fb-titelbild-1640x624.jpg')
save(post_photo(1080, 1350, 'derby', (0.75, 0.5), ('RAPID STICKER', 'AUS WIEN WEST'), 'Premium-Vinyl · einzeln 3,50 € · im Mix bis −20 %'), 'facebook/fb-beitrag-1080x1350.jpg')
lk = cover(1200, 630, 1200, 630, 21, 1.25, 225); save(lk, 'facebook/fb-linkbild-1200x630.jpg')
save(story(1080, 1920, 'fanszene', (0.5, 0.5)), 'facebook/fb-story-1080x1920.jpg')
# Instagram
save(profile(1080), 'instagram/ig-profilbild-1080x1080.png', True)
save(post_photo(1080, 1350, 'christkindl', (0.5, 0.45), ('HÜTTELDORF', 'KLEBT ÜBERALL'), 'Premium-Sticker aus dickem Vinyl · 3,50 €'), 'instagram/ig-beitrag-1080x1350.jpg')
save(post_photo(1080, 1440, 'steffl', (0.5, 0.5), ('RAPID STICKER', 'AUS WIEN WEST'), 'Einzeln 3,50 € · im Mix bis −20 %', top_frac=0.7), 'instagram/ig-beitrag-3zu4-1080x1440.jpg')
save(story(1080, 1920, 'derby', (0.72, 0.5)), 'instagram/ig-story-1080x1920.jpg')
for lab, nm in [('NEU', 'antiviola-schwein'), ('MIX', 'forza-rapid-block'), ('DERBY', 'anti-viola'), ('HÜTTELDORF', 'wien-west-huetteldorf'), ('INFO', 'block-west')]:
    save(highlight(1080, 1920, lab, nm), f'instagram/highlight-covers/ig-highlight-{lab.lower().replace("ü","ue")}-1080x1920.jpg')
# Google Unternehmensprofil
save(logo_white(720), 'google-unternehmensprofil/gbp-logo-720x720.png', True)
save(cover(1080, 608, 1080, 608, 31, 1.15, 225), 'google-unternehmensprofil/gbp-titelbild-1080x608.jpg')
save(post_photo(1200, 900, 'kaffeehaus', (0.5, 0.45), ('RAPID STICKER',), 'Premium-Vinyl · 3,50 € · Mix bis −20 %', top_frac=0.66), 'google-unternehmensprofil/gbp-beitrag-1200x900.jpg')
save(sticker_grid(1080, 1080, title=False, n=9), 'google-unternehmensprofil/gbp-foto-sortiment-1080x1080.jpg')
# TikTok
save(profile(1080), 'tiktok/tt-profilbild-1080x1080.png', True)
save(story(1080, 1920, 'spray', (0.5, 0.5)), 'tiktok/tt-cover-1080x1920.jpg')
# Pinterest
save(profile(800), 'pinterest/pin-profilbild-800x800.png', True)
save(cover(1920, 1080, 1920, 1080, 41, 1.9, 220), 'pinterest/pin-titelbild-1920x1080.jpg')
save(post_photo(1000, 1500, 'steffl', (0.5, 0.5), ('RAPID STICKER', 'AUS WIEN WEST'), 'Einzeln 3,50 € · im Mix bis −20 %', top_frac=0.72), 'pinterest/pin-pin-1000x1500.jpg')
# YouTube (Safe Area 1546x423)
save(profile(800), 'youtube/yt-profilbild-800x800.png', True)
save(cover(2560, 1440, 1700, 470, 51, 1.12, 235, wall_scale=0.55, lines=('RAPID STICKER AUS WIEN WEST',)), 'youtube/yt-banner-2560x1440.jpg')
# WhatsApp Business
save(profile(640), 'whatsapp/wa-profilbild-640x640.png', True)
# X
save(profile(400), 'x/x-profilbild-400x400.png', True)
save(cover(1500, 500, 1100, 500, 61, 1.15, 220), 'x/x-header-1500x500.jpg')
