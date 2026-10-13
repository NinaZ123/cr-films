# Render each EDL entry to a graded 1920x1080 (2.39:1 letterboxed) ProRes-free H.264 segment, then concat.
import subprocess, os, sys
sys.path.insert(0,"scripts"); from edl import EDL
FPS=24; W,H=1920,804   # 2.39:1 active area
GRADE=(f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1,"
       "eq=saturation=0.82:contrast=1.04:gamma=0.97,"
       "curves=r='0/0.03 0.5/0.50 1/0.95':g='0/0.035 0.5/0.49 1/0.94':b='0/0.06 0.5/0.47 1/0.88',"
       "colorbalance=rs=-0.03:bs=0.04:rh=0.04:bh=-0.04,"
       "vignette=angle=PI/4.2,noise=alls=9:allf=t,"
       "pad=1920:1080:0:138:black")
def run(a): subprocess.run(["ffmpeg","-v","error","-y"]+a,check=True)
os.makedirs("work/seg",exist_ok=True); segs=[]
for i,(kind,src,tin,dur,_) in enumerate(EDL):
    out=f"work/seg/{i:02d}.mp4"; segs.append(out); n=round(dur*FPS)
    enc=["-frames:v",str(n),"-r",str(FPS),"-c:v","libx264","-preset","slow","-crf","16","-pix_fmt","yuv420p","-an",out]
    if kind=="shot":
        fade=f",fade=t=in:st=0:d=0.25" if i in (1,) else ""
        run(["-ss",str(tin),"-i",src,"-vf",GRADE+fade]+enc)
    elif kind=="black":
        run(["-f","lavfi","-i",f"color=black:s=1920x1080:r={FPS}"]+enc)
    else:
        run(["-loop","1","-r",str(FPS),"-i",f"work/cards/{i:02d}.png","-vf",
             f"noise=alls=5:allf=t,fade=t=in:st=0:d=0.6,fade=t=out:st={dur-0.7}:d=0.7"]+enc)
with open("work/seg/list.txt","w") as f:
    for s in segs: f.write(f"file '{os.path.basename(s)}'\n")
run(["-f","concat","-safe","0","-i","work/seg/list.txt","-c","copy","work/picture.mp4"])
print("ok")
