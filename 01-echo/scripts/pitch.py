import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import stft
N=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
for f in sys.argv[1:]:
    sr,x=wavfile.read(f); x=x.astype(float)
    fr,t,Z=stft(x,sr,nperseg=4096,noverlap=3072); P=np.abs(Z)
    m=(fr>60)&(fr<2000); ch=np.zeros(12)
    for i in np.where(m)[0]:
        ch[int(round(12*np.log2(fr[i]/261.63)))%12]+=P[i].sum()
    ch/=ch.max()
    # crude f0 per frame via autocorrelation in 90-500Hz
    hop=sr//10; f0=[]
    for s in range(0,len(x)-2048,hop):
        seg=x[s:s+2048]*np.hanning(2048); ac=np.correlate(seg,seg,'full')[2047:]
        lo,hi=int(sr/500),int(sr/90); k=lo+np.argmax(ac[lo:hi]); f0.append(sr/k if ac[k]>0.4*ac[0] else 0)
    notes=[N[int(round(12*np.log2(v/261.63)))%12] if v else '.' for v in f0]
    print(f.split('/')[-1],'chroma:',' '.join(f'{N[i]}{ch[i]:.2f}' for i in np.argsort(-ch)[:5]))
    print('  voiced %.0f%%'%(100*np.mean(np.array(f0)>0)),''.join(n[0] if n!='.' else '.' for n in notes))
