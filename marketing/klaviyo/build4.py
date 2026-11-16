exec(open('mk.py').read())
H1='https://cdn.klaviyomail.com/company/XmmBRV/images/c4e67518-4d11-4dbf-946d-11517096f7f6.jpeg'
H2='https://cdn.klaviyomail.com/company/XmmBRV/images/6bed36b5-9a44-44b9-80c0-e77c8a94f0da.jpeg'
O='#ff9a3c'
def punch(h,sub):
    return f'<tr><td class="px" style="padding:30px 40px 6px;"><h1 class="h1" style="margin:0 0 10px;font-size:38px;line-height:40px;font-weight:900;color:{DG};text-transform:uppercase;letter-spacing:-0.5px;">{h}</h1><p style="margin:0 0 10px;font-size:17px;line-height:25px;">{sub}</p></td></tr>'
def premium():
    return f'''<tr><td style="padding:10px 24px 14px;"><table role="presentation" width="100%" style="background:{INK};border-radius:6px;"><tr><td align="center" style="padding:20px 16px;"><div style="font-size:12px;letter-spacing:3px;color:{O};font-weight:800;">ABSOLUTE PREMIUM-STICKER</div><div style="font-size:22px;line-height:28px;color:#fff;font-weight:900;text-transform:uppercase;padding-top:6px;">Dickes Vinyl. Matt laminiert.<br>Hält Regen, Frost und Sonne. Jahrelang.</div></td></tr></table></td></tr>'''
def slogan(t):
    return f'<tr><td align="center" style="padding:6px 40px 18px;"><div style="font-size:20px;font-weight:900;letter-spacing:2px;color:{G};text-transform:uppercase;">{t}</div></td></tr>'
def mix():
    rows=''.join(f'<tr><td style="padding:9px 14px;border-bottom:1px solid #e3e0d6;font-size:15px;">ab {n} Stück</td><td style="padding:9px 14px;border-bottom:1px solid #e3e0d6;font-size:15px;text-align:right;"><b style="color:{G};">−{r} %</b></td></tr>' for n,r in [(5,5),(10,10),(15,12),(25,15),(50,20)])
    return f'<tr><td style="padding:0 40px 8px;" class="px"><table role="presentation" width="100%" style="background:{PAPER};border-radius:6px;">{rows}</table><div style="font-size:12px;color:#666;padding-top:8px;">Motive frei mischen, Rabatt zieht automatisch.</div></td></tr>'
def code():
    return f'''<tr><td style="padding:14px 40px 20px;" class="px"><table role="presentation" width="100%" style="border:3px dashed {G};border-radius:8px;background:#eef6f1;"><tr><td align="center" style="padding:16px;"><div style="font-size:13px;letter-spacing:2px;color:{DG};font-weight:800;">ERSTBESTELLUNG? 10 % MIT</div><div style="display:inline-block;margin-top:8px;background:{DG};color:#fff;font-family:Courier New,monospace;font-size:22px;font-weight:700;letter-spacing:3px;padding:8px 20px;border-radius:4px;">WILLKOMMEN10</div><div style="font-size:12px;color:#333;padding-top:8px;">Nicht mit dem Mix-Rabatt kombinierbar.</div></td></tr></table></td></tr>'''
top=[('wien-west-huetteldorf-sticker','Wien West Hütteldorf','3,50 €','wien-west-huetteldorf.png'),('forza-rapid-block-sticker','Forza Rapid','3,50 €','forza-rapid-block.png'),('scr-1899-sticker','SCR 1899','3,50 €','scr-1899.png'),('anti-viola-sticker','Anti Viola','3,50 €','anti-viola.png')]
top2=top+[('weststadion-sticker','Weststadion','3,50 €','weststadion.png'),('wien-gehoert-uns-sticker','Wien gehört uns!','3,50 €','wien-gehoert-uns.png')]
# Kampagne 1 Fanklub
a=head('Servus Fanklub!','Absolute Premium-Sticker für euren Klub. Forza Rapid!')
a+=img(H1,'Premium-Sticker für euren Fanklub',S+'/collections/all')+band()
a+=punch('Servus Fanklub!','Pickerl für Block, Bus und Stammbeisl. Von Fans aus Hütteldorf, für euch.')
a+=premium()
a+=grid(top)+btn('Motive aussuchen',S+'/collections/all')
a+=text('Je mehr, desto billiger',['Für den ganzen Klub mitbestellen zahlt sich aus:'])
a+=mix()+code()
a+=text('Großbestellung?',['Schreibt uns einfach zurück: Stückzahl und Motive. Wir melden uns.'])
a+=slogan('Forza Rapid! Grün-Weiß bis ans Ende.')
a+=foot(); open('html/fanklub.html','w').write(a)
# Kampagne 2 Topseller
b=head('Forza Rapid. Dein Mix.','Absolute Premium-Sticker aus Hütteldorf. Mischen und sparen.')
b+=img(H2,'Wien West Sticker in Wien',S+'/collections/all')+band()
b+=punch('Forza Rapid. Dein Mix.','Unsere Topseller. Für Laterne, Laptop und Auswärtsfahrt.')
b+=premium()
b+=grid(top2)+btn('Alle Motive',S+'/collections/all')
b+=text('Mischen und sparen',[])
b+=mix()+code()
b+=slogan('Wir sind Rapid. Hütteldorf. 1899.')
b+=foot(); open('html/produkte.html','w').write(b)
