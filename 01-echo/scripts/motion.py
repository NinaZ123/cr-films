import sys, subprocess, numpy as np
for v in sys.argv[1:]:
    raw = subprocess.run(["ffmpeg","-v","error","-i",v,"-vf","scale=96:40,format=gray","-f","rawvideo","-"],capture_output=True).stdout
    f = np.frombuffer(raw,np.uint8).reshape(-1,40,96).astype(float)
    d = np.abs(np.diff(f,axis=0)).mean((1,2))
    print(v, ' '.join(f'{x:.1f}' for x in d[::6]), '| peak at %.2fs'%((np.argmax(d)+1)/24))
