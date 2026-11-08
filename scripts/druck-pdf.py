# Baut druckfertige PDFs: 94 × 64 mm Seite (2 mm Beschnitt), Motiv 90 × 60 mm, Schnittkontur als Sonderfarbe "CutContour"
import glob, os, sys
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import CMYKColorSep, white

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG = sorted(glob.glob(os.path.join(ROOT, 'druck/png/*.png')))
OUT = os.path.join(ROOT, 'druck/pdf'); os.makedirs(OUT, exist_ok=True)
B = 2 * mm; W, H = 90 * mm, 60 * mm
cut = CMYKColorSep(0, 1, 0, 0, spotName='CutContour', density=1)

def seite(c, png):
    c.setFillColor(white); c.rect(0, 0, W + 2 * B, H + 2 * B, stroke=0, fill=1)
    c.drawImage(png, B, B, W, H)
    c.setStrokeColor(cut); c.setLineWidth(0.25)
    try: c.setStrokeOverprint(True)
    except Exception: pass
    c.roundRect(B + 0.2 * mm, B + 0.2 * mm, W - 0.4 * mm, H - 0.4 * mm, 1.8 * mm, stroke=1, fill=0)

alle = canvas.Canvas(os.path.join(OUT, '00-ALLE-30-MOTIVE.pdf'), pagesize=(W + 2 * B, H + 2 * B))
alle.setTitle('Wien West Sticker – 30 Motive')
for p in PNG:
    name = os.path.splitext(os.path.basename(p))[0]
    c = canvas.Canvas(os.path.join(OUT, name + '.pdf'), pagesize=(W + 2 * B, H + 2 * B))
    c.setTitle(name); seite(c, p); c.showPage(); c.save()
    seite(alle, p); alle.showPage()
alle.save()
print(len(PNG), 'PDFs')
