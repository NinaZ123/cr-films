# strip.py out.jpg n video... : n evenly spaced frames per video, one row per video
import sys, subprocess, json
from PIL import Image
out, n, vids = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
W, H = 400, 170
sheet = Image.new("RGB", (W*n, H*len(vids)))
for r, v in enumerate(vids):
    d = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",v]))
    for k in range(n):
        t = 0.05 + (d-0.25)*k/(n-1)
        subprocess.run(["ffmpeg","-v","error","-y","-ss",f"{t:.2f}","-i",v,"-frames:v","1","-vf",f"scale={W}:{H}","/tmp/_f.png" if False else "work/_f.png"],check=True)
        sheet.paste(Image.open("work/_f.png").convert("RGB"), (k*W, r*H))
sheet.save(out, quality=85)
