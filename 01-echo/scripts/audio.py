# Build the full soundtrack: ambience beds, the song, synthesized rock score, SFX, and native clip audio.
import sys, subprocess, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, lfilter, fftconvolve
sys.path.insert(0, "scripts"); from edl import timeline
SR = 48000; rng = np.random.default_rng(7)
TL, T = timeline(); N = int(T*SR)+SR
L = np.zeros(N); R = np.zeros(N)

def load(path, t0=None, dur=None):
    a = ["ffmpeg","-v","error"] + (["-ss",str(t0)] if t0 is not None else []) + ["-i",path]
    a += (["-t",str(dur)] if dur else []) + ["-ac","1","-ar",str(SR),"-f","s16le","-"]
    return np.frombuffer(subprocess.run(a,capture_output=True).stdout,np.int16).astype(float)/32768
def filt(x, kind, f, order=4): return sosfilt(butter(order, f, kind, fs=SR, output="sos"), x)
def db(g): return 10**(g/20)
def env(n, a=0.005, r=0.02):
    e = np.ones(n); ka, kr = int(a*SR), int(r*SR)
    if ka: e[:ka] = np.linspace(0,1,ka)
    if kr: e[-kr:] *= np.linspace(1,0,kr)
    return e
def place(x, t, g=0.0, pan=0.0, width=0.0):
    i = int(t*SR); x = x[:max(0,N-i)]*db(g)
    l, r = np.sqrt((1-pan)/2), np.sqrt((1+pan)/2)
    L[i:i+len(x)] += x*l*np.sqrt(2)
    xr = x if not width else np.concatenate([np.zeros(int(width*SR)), x])[:len(x)]
    R[i:i+len(x)] += xr*r*np.sqrt(2)
def ir(sec, damp=6000, pre=0.01):
    n = int(sec*SR); h = rng.standard_normal(n)*np.exp(-6.9*np.arange(n)/n)
    h = filt(h,"lowpass",damp,2); h[:int(pre*SR)] = 0; return h/np.sqrt((h**2).sum())
def verb(x, sec=2.5, wet=0.4, damp=6000):
    return x*(1-wet) + fftconvolve(x, ir(sec,damp))[:len(x)]*wet*1.5
def loop_to(x, n, xf=0.5):
    k = int(xf*SR); out = x.copy()
    while len(out) < n:
        f = np.linspace(0,1,k); out[-k:] = out[-k:]*(1-f) + x[:k]*f; out = np.concatenate([out, x[k:]])
    return out[:n]
def at(name):  # timeline start of the EDL entry whose source contains name
    for r in TL:
        if r[2] and name in str(r[2]): return r[0]

# ---------- ambience beds ----------
rain = filt(load("audio/src/rain.mp4"),"highpass",120)
place(loop_to(rain, int(17.5*SR))*env(int(17.5*SR),1.2,1.5), 0.0, -12, width=0.013)
inside = filt(loop_to(rain, int(30*SR)),"lowpass",500)              # rain heard through the roof
place(inside*env(len(inside),2,3), 17.5, -22, width=0.017)
hall = filt(load("audio/src/hall.mp4"),"highpass",60)
h = loop_to(hall, int(30*SR)); place(h*env(len(h),1.5,3), 20.5, -8, width=0.011)
h2 = loop_to(hall, int(9.6*SR)); place(h2*env(len(h2),0.3,1.5), 72.25, -10, width=0.011)  # room tone at the end

# ---------- tonal drone (E) ----------
def drone(dur, f0=41.2, swell=True):
    n=int(dur*SR); t=np.arange(n)/SR
    x = sum(np.sin(2*np.pi*f*t + rng.uniform(0,6)) * a for f,a in [(f0,1),(f0*1.003,.6),(f0*1.5,.25),(f0*2,.3),(f0*3.01,.08)])
    x += filt(rng.standard_normal(n),"bandpass",[f0*2,f0*8],2)*0.6
    e = (0.6+0.4*np.sin(2*np.pi*t/7.0)) if swell else 1
    return x*e*env(n,dur*0.3,dur*0.3)/3
place(drone(17.5), 0.0, -33)
place(drone(10), 20.0, -32)
place(drone(10, 38.9), 40.0, -20)          # darker, a semitone down, for the faceless figure

# ---------- impacts ----------
def boom(dur=4.0, f1=110, f2=32):
    n=int(dur*SR); t=np.arange(n)/SR; f=f2+(f1-f2)*np.exp(-t*6)
    x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*1.4)
    x+=filt(rng.standard_normal(n),"lowpass",300,2)*np.exp(-t*5)*0.5
    return verb(x,3.5,0.35,2500)
def braam(dur=3.0, f0=41.2):
    n=int(dur*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for d in (-0.07,0,0.05,0.11):
        for m in (1,2,1.5):
            ph=2*np.pi*f0*m*(1+d/100)*t; x+=(2*((ph/(2*np.pi))%1)-1)/m
    x=np.tanh(1.5*x/4); x=filt(x,"lowpass",900,2)*np.exp(-t*0.9)*env(n,0.01,0.4)
    return verb(x,4,0.4,3000)
place(boom(), at("那年之后"), -6)
place(boom(), at("有些歌"), -2)
place(braam(), at("有些歌"), -7)

# ---------- the song (one singer: songS) ----------
song = filt(load("audio/src/songS.mp4"),"highpass",90); ns=len(song)
ts = at("s06.mp4")+0.5                     # creeps in while he listens
st = np.arange(ns)/SR + ts
far  = verb(filt(song,"lowpass",1400),3.5,0.65,3000)
tape = verb(filt(filt(song,"highpass",250),"lowpass",5500),2.2,0.35)
def ramp(t, pts):  return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
c7, c8, c10 = at("s07.mp4"), at("s08.mp4"), at("s10.mp4")
gfar  = ramp(st, [(ts,0),(ts+2,0.5),(c7,0.6),(c7+0.6,0.0),(1e9,0)])
gtape = ramp(st, [(ts,0),(c7-0.3,0),(c7+0.3,0.8),(c8,0.8),(c8+0.4,1.0),(c10,1.0),(c10+2.5,0.0),(1e9,0)])
mix = far*gfar + tape*gtape
place(mix, ts, 11, width=0.009)
# its reverb tail, reversed, swelling into the second card
tail = verb(song[int(4*SR):int(9*SR)],6,0.9,2500)[::-1]
tail = tail*np.linspace(0,1,len(tail))**2
place(tail, at("有些歌")-len(tail)/SR, -6, width=0.02)

# ---------- rock score, 96 BPM, E minor ----------
BPM=96; beat=60/BPM; rock0=at("s12.mp4"); rock1=at("s21.mp4")+beat*2   # stops dead on the black
def ks(freq, dur, bright=0.5, decay=0.996):
    n=int(dur*SR); P=max(2,int(SR/freq)); exc=rng.uniform(-1,1,P)
    exc=lfilter([bright,1-bright],[1],exc)
    a=np.zeros(P+2); a[0]=1; a[P]=-decay/2; a[P+1]=-decay/2
    x=np.zeros(n); x[:P]=exc; return lfilter([1],a,x)
def chord(root, dur, mute):
    x=sum(ks(root*m, dur, 0.6) for m in (1,1.4983,2))
    if mute: x*=np.exp(-np.arange(len(x))/SR*18)
    return x
def amp(x, drive=9):
    x=filt(x,"highpass",90,2); x=np.tanh(drive*x); x=filt(x,"lowpass",4800,4)
    return filt(x,"highpass",70,2)
E2,C3,D3,B2,G2=82.41,130.81,146.83,123.47,98.0
prog=[E2,C3,D3,B2]
glL=np.zeros(N); glR=np.zeros(N); bass=np.zeros(N); drums=np.zeros(N)
def put(buf,x,t):
    i=int(t*SR); x=x[:max(0,len(buf)-i)]; buf[i:i+len(x)]+=x
def kick():
    n=int(0.35*SR); t=np.arange(n)/SR; f=45+110*np.exp(-t*35)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)+filt(rng.standard_normal(n),"highpass",3000,2)*np.exp(-t*200)*0.3
def snare():
    n=int(0.3*SR); t=np.arange(n)/SR
    return (np.sin(2*np.pi*190*t)*np.exp(-t*25)*0.6 + filt(rng.standard_normal(n),"bandpass",[1500,8000],2)*np.exp(-t*14))
def hat(o=False):
    n=int((0.25 if o else 0.06)*SR); t=np.arange(n)/SR
    return filt(rng.standard_normal(n),"highpass",7000,4)*np.exp(-t*(12 if o else 60))*0.35
def crash():
    n=int(2.5*SR); t=np.arange(n)/SR
    return filt(rng.standard_normal(n),"highpass",4000,2)*np.exp(-t*1.6)*0.5
t=rock0; k=0
while t < rock1-1e-6:
    bar=int((t-rock0)/(4*beat)); pos=k%8; root=prog[bar%4]
    sustain = pos in (0,) or (rock1-t)<4*beat+1e-6
    for buf,dt in ((glL,0.0),(glR,0.011)):
        put(buf, chord(root, beat*(2 if sustain else 0.5), not sustain), t+dt)
    put(bass, ks(root/2, beat/2*0.95, 0.3, 0.999), t)
    if pos in (0,3,4): put(drums, kick(), t)
    if pos in (2,6): put(drums, snare(), t)
    put(drums, hat(pos==7)*(1.0 if pos%2==0 else 0.6), t)
    t+=beat/2; k+=1
for c in (rock0, rock0+8*beat, rock0+16*beat, rock0+24*beat, at("s21.mp4")): put(drums, crash(), c)
# snare build-up in the last beats of the card before the rock comes in
for j in range(12):
    tt=rock0-beat*2+j*beat/6; put(drums, snare()*(0.25+0.75*j/11), tt)
cut=int(rock1*SR)
for buf in (glL,glR,bass,drums): buf[cut:]=0; buf[cut-200:cut]*=np.linspace(1,0,200)
gtrL, gtrR = amp(glL), amp(glR)
rk = int(rock0*SR)-int(3*beat*SR)
dr = drums.copy(); dr[rk:cut] = verb(drums[rk:cut],0.9,0.18,7000); dr[cut:]=0
bs = filt(np.tanh(3*bass),"lowpass",700,2)
L += gtrL*db(-9) + bs*db(-3) + dr*db(-2)
R += gtrR*db(-9) + bs*db(-3) + dr*db(-2)

# ---------- native clip audio (sync SFX) ----------
def voiced(x):
    hop=SR//10; v=0; n=0
    for s in range(0,len(x)-2048,hop):
        seg=x[s:s+2048]*np.hanning(2048); ac=np.correlate(seg,seg,'full')[2047:]
        lo,hi=SR//500,SR//90; kk=lo+np.argmax(ac[lo:hi]); v+=ac[kk]>0.4*ac[0]; n+=1
    return v/max(n,1)
for (t0,kind,src,tin,dur,g) in TL:
    if kind!="shot" or g is None: continue
    x=load(src,tin,dur); v=voiced(x[::4]) if len(x) else 1
    if v>0.4: print(f"skip native {src} voiced={v:.2f}"); continue
    x=filt(x,"highpass",60)*env(len(x),0.02,0.05); place(x,t0,g,width=0.007)

# designed SFX on picture events
def thud():
    n=int(0.6*SR); t=np.arange(n)/SR
    x=np.sin(2*np.pi*np.cumsum(70+60*np.exp(-t*40))/SR)*np.exp(-t*14)
    x+=filt(rng.standard_normal(n),"bandpass",[300,2500],2)*np.exp(-t*40)*0.6
    return verb(x,3,0.45,4000)
seat_up = at("s20c.mp4") + (2.1-0.5)
place(thud(), seat_up, -4)
place(boom(5.0,90,28), at("回 响"), -4)
# a last, distant line of the song over the title
echo = verb(filt(song[int(9*SR):int(13.5*SR)],"bandpass",[300,3000],2),5,0.85,2000)
echo *= env(len(echo),0.8,1.5); place(echo, at("回 响")+0.8, -14, width=0.02)

# hard silence on the black after the turn
s0, s1 = int(rock1*SR), int((at("s20c.mp4"))*SR)
for ch in (L,R): ch[s0:s1] *= 0.0; ch[s0-480:s0] *= np.linspace(1,0,480)
fin=int(T*SR); fo=int(2.0*SR)
for ch in (L,R): ch[fin-fo:fin]*=np.linspace(1,0,fo); ch[fin:]=0
out=np.stack([L[:fin],R[:fin]],1); out/=np.abs(out).max()*1.12
wavfile.write("work/mix_raw.wav",SR,(out*32767).astype(np.int16))
print("mix ok", T)
