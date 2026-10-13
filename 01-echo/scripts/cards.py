# Render title cards / end title as 1920x1080 PNGs (ffmpeg here has no drawtext)
from PIL import Image, ImageDraw, ImageFont
import sys
SONG="/System/Library/Fonts/Supplemental/Songti.ttc"
def card(path, lines, size=54, spacing=1.9, color=(222,214,196)):
    im=Image.new("RGB",(1920,1080),(0,0,0)); d=ImageDraw.Draw(im); f=ImageFont.truetype(SONG,size,index=0)
    lh=int(size*spacing); y0=540-lh*len(lines)//2
    for i,l in enumerate(lines):
        w=d.textlength(l,font=f); d.text(((1920-w)/2,y0+i*lh),l,font=f,fill=color)
    im.save(path)
def title(path):
    im=Image.new("RGB",(1920,1080),(0,0,0)); d=ImageDraw.Draw(im)
    f1=ImageFont.truetype(SONG,150,index=0); f2=ImageFont.truetype(SONG,30,index=0); f3=ImageFont.truetype(SONG,24,index=0)
    t="回　响"; w=d.textlength(t,font=f1); d.text(((1920-w)/2,380),t,font=f1,fill=(232,224,206))
    t="E   C   H   O"; w=d.textlength(t,font=f2); d.text(((1920-w)/2,590),t,font=f2,fill=(170,160,145))
    t="一部虚构电影的预告"; w=d.textlength(t,font=f3); d.text(((1920-w)/2,930),t,font=f3,fill=(90,86,80))
    im.save(path)
if __name__=="__main__":
    from edl import EDL
    for i,e in enumerate(EDL):
        if e[0]=="card": card(f"work/cards/{i:02d}.png", e[1].split("|"))
        if e[0]=="title": title(f"work/cards/{i:02d}.png")
