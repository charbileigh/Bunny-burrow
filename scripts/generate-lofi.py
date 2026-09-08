"""Original sample-free music and forest textures. Python 3 + NumPy."""
from pathlib import Path
import wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]/'dist'/'audio'
if not ROOT.exists(): ROOT=Path(__file__).resolve().parents[1]/'audio'
SR=22050
rng=np.random.default_rng(91026)
def write(name,x):
    x=np.tanh(x*1.15)
    x=x/max(np.max(np.abs(x)),.01)*.65
    with wave.open(str(ROOT/(name+'.wav')),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR)
        w.writeframes((x*32767).astype('<i2').tobytes())
def tone(midi,duration,soft=1):
    t=np.arange(int(duration*SR))/SR;f=440*2**((midi-69)/12)
    env=(1-np.exp(-t*65))*np.exp(-t*(1.7 if soft else 3))
    vibrato=.002*np.sin(2*np.pi*4*t)
    return (np.sin(2*np.pi*f*t+vibrato)+.22*np.sin(2*np.pi*2*f*t)*np.exp(-t*3)+.07*np.sin(2*np.pi*3*f*t))*env
for name,bpm,chords,melody in [
 ('lofi_petal',75,[[48,55,59,62],[45,52,55,59],[50,57,60,64],[43,50,53,57]],[74,71,67,69,72,71,69,67]),
 ('lofi_moon',68,[[45,52,55,59],[41,48,52,55],[48,55,59,62],[43,50,53,57]],[76,72,71,67,69,71,72,67]),
 ('lofi_cocoa',80,[[50,57,60,64],[43,50,53,57],[48,55,59,62],[48,55,57,64]],[77,76,72,69,74,72,71,67])]:
    beat=60/bpm;n=round(32*beat*SR);x=np.zeros(n)
    def add(at,clip,gain=1):
        np.add.at(x,(round(at*SR)+np.arange(len(clip)))%n,clip*gain)
    for bar in range(8):
        chord=chords[bar%4];start=bar*4*beat
        for j,note in enumerate(chord): add(start+j*.014,tone(note,3.5),.075)
        for b in (0,2.5): add(start+b*beat,tone(chord[0]-12,1.2),.15)
        for b in (0,2):
            t=np.arange(int(.23*SR))/SR
            kick=np.sin(2*np.pi*(48*t+55*(1-np.exp(-t*35))/35))*np.exp(-t*18)
            add(start+b*beat,kick,.23)
        for b in (1,3):
            t=np.arange(int(.16*SR))/SR;noise=rng.normal(size=len(t));noise=np.convolve(noise,np.ones(4)/4,mode='same')
            add(start+b*beat,noise*np.exp(-t*35),.1)
        for b in range(8):
            t=np.arange(int(.06*SR))/SR;noise=rng.normal(size=len(t));noise=np.r_[0,np.diff(noise)]
            add(start+(b*.5+(.075 if b%2 else 0))*beat,noise*np.exp(-t*85),.017 if b%2 else .023)
        for j in range(2):
            at=start+(1.65+j*1.35)*beat;note=melody[(bar+j)%len(melody)]
            clip=tone(note,1.8,0);add(at,clip,.06);add(at+beat*.75,clip,.015)
    # Gentle low-pass softens percussion without a discontinuity at the loop seam.
    freqs=np.fft.rfftfreq(n,1/SR)
    x=np.fft.irfft(np.fft.rfft(x)/(1+(freqs/4200)**4),n=n)
    write(name,x)
n=SR*32;t=np.arange(n)/SR;freq=np.fft.rfftfreq(n,1/SR)
def texture(low,high):
    spec=np.fft.rfft(rng.normal(size=n));weight=(1-np.exp(-(freq/low)**4))*np.exp(-(freq/high)**4)
    y=np.fft.irfft(spec*weight,n=n);return y/np.std(y)
x=texture(100,1100)*(.12+.06*np.sin(2*np.pi*t/32))
x+=texture(2000,7500)*(.11+.08*np.sin(2*np.pi*t/8)**2)
# Soft branch creaks distinguish the trees from the existing broad forest breeze.
for at in (3,11,20,27):
    u=np.arange(int(1.4*SR))/SR
    creak=np.sin(2*np.pi*(170*u+18*u*u)+.7*np.sin(2*np.pi*9*u))*np.sin(np.pi*u/1.4)**2
    np.add.at(x,(int(at*SR)+np.arange(len(u)))%n,creak*.045)
write('forest_trees',x)
print('Generated three original lo-fi loops and Forest trees.')
