# Edit decision list: (kind, source, src_in, dur, native_audio_gain_db)
# kind: shot | card | black.  Timeline is the running sum of dur.
EDL = [
 ("black", None, 0, 1.5, None),
 ("shot", "vid/s01.mp4", 0.3, 4.5, -4),
 ("shot", "vid/s02.mp4", 0.5, 4.0, -14),
 ("shot", "vid/s03.mp4", 0.5, 3.5, -14),
 ("shot", "vid/s04.mp4", 0.0, 4.0, -12),
 ("card", "那年之后|他再没回来过", 0, 3.0, None),
 ("shot", "vid/s05.mp4", 0.5, 4.5, -12),
 ("shot", "vid/s06.mp4", 0.3, 4.0, None),
 ("shot", "vid/s07.mp4", 0.5, 3.5, None),
 ("shot", "vid/s08.mp4", 0.5, 4.5, None),
 ("shot", "vid/s09.mp4", 0.5, 3.0, None),
 ("shot", "vid/s10.mp4", 0.5, 3.5, -16),
 ("shot", "vid/s11.mp4", 0.8, 4.0, -12),
 ("card", "有些歌|一直在等人回来", 0, 2.5, None),
 ("shot", "vid/s12.mp4", 0.3, 1.875, None),
 ("shot", "vid/s13.mp4", 0.5, 1.875, -14),
 ("shot", "vid/s16.mp4", 1.0, 2.5, None),
 ("shot", "vid/s14.mp4", 0.5, 1.25, -12),
 ("shot", "vid/s15.mp4", 0.5, 2.5, None),
 ("shot", "vid/s17.mp4", 2.2, 1.25, -6),
 ("shot", "vid/s18.mp4", 0.5, 2.5, None),
 ("shot", "vid/s22.mp4", 0.5, 2.5, None),
 ("shot", "vid/s19.mp4", 1.0, 3.75, None),
 ("shot", "vid/s21.mp4", 0.6, 1.25, None),
 ("black", None, 0, 1.0, None),
 ("shot", "vid/s20c.mp4", 0.5, 4.0, -18),
 ("black", None, 0, 0.6, None),
 ("title", "回 响|E C H O", 0, 5.0, None),
]
def timeline():
    t=0; out=[]
    for e in EDL: out.append((t,)+e); t+=e[3]
    return out, t
if __name__=="__main__":
    tl,T=timeline()
    for r in tl: print(f"{r[0]:6.2f}  {r[1]:5s} {str(r[2]):22s} in={r[3]} dur={r[4]}")
    print("total",T)
