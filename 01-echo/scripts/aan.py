import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import stft
for f in sys.argv[1:]:
    sr,x = wavfile.read(f); x = x.astype(float)/32768
    rms = [20*np.log10(np.sqrt(np.mean(x[i:i+sr//2]**2))+1e-9) for i in range(0,len(x)-sr//2,sr//2)]
    fr,t,Z = stft(x,sr,nperseg=2048); P=np.abs(Z)**2
    flat = np.exp(np.mean(np.log(P+1e-12),0))/(np.mean(P,0)+1e-12)  # spectral flatness: low=tonal
    cent = (fr[:,None]*P).sum(0)/(P.sum(0)+1e-12)
    vb = P[(fr>200)&(fr<3500)].sum()/P.sum()
    print(f"{f.split('/')[-1]:14s} rms(dB/0.5s): {' '.join(f'{r:.0f}' for r in rms)} | flatness {np.median(flat):.3f} centroid {np.median(cent):.0f}Hz voiceband {vb:.2f}")
