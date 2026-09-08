"""Generate Bunny Burrow's three additional sample-free lo-fi tracks."""
from pathlib import Path
import wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]/'dist'/'audio'
SR=44100
rng=np.random.default_rng(180726)
def write(name,x):
    x=np.tanh(x*1.15)
    x=x/max(np.max(np.abs(x)),.01)*.70
    x=np.stack([x*.94+np.roll(x,int(SR*.031))*.06,x*.94+np.roll(x,int(SR*.047))*.06],axis=1)
    with wave.open(str(ROOT/(name+'.wav')),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
        w.writeframes((x*32767).astype('<i2').tobytes())
def tone(midi,duration,soft=1):
    t=np.arange(int(duration*SR))/SR;f=440*2**((midi-69)/12)
    env=(1-np.exp(-t*65))*np.exp(-t*(1.7 if soft else 3))
    vibrato=.002*np.sin(2*np.pi*4*t)
    return (np.sin(2*np.pi*f*t+vibrato)+.22*np.sin(2*np.pi*2*f*t)*np.exp(-t*3)+.07*np.sin(2*np.pi*3*f*t))*env
for name,bpm,chords,melody in [
 ('lofi_rainy_window',66,[[50,57,60,64],[46,53,57,60],[53,60,64,67],[48,55,58,62]],[77,76,72,69,74,72,70,69]),
 ('lofi_lavender_evening',72,[[51,58,62,65],[48,55,58,62],[53,60,63,67],[46,53,56,60]],[79,77,74,70,72,74,77,75]),
 ('lofi_sunday_sketchbook',84,[[53,60,64,67],[50,57,60,64],[55,62,65,69],[48,55,58,62]],[81,79,76,72,74,76,79,77])
]:
    beat=60/bpm;n=round(64*beat*SR);x=np.zeros(n)
    def add(at,clip,gain=1):
        np.add.at(x,(round(at*SR)+np.arange(len(clip)))%n,clip*gain)
    for bar in range(16):
        chord=chords[bar%4];start=bar*4*beat
        for j,note in enumerate(chord): add(start+j*.014,tone(note,3.5),.075)
        for b in (0,2.5): add(start+b*beat,tone(chord[0]-12,1.2),.15)
        for b in (0,2.25):
            t=np.arange(int(.23*SR))/SR
            kick=np.sin(2*np.pi*(48*t+55*(1-np.exp(-t*35))/35))*np.exp(-t*18)
            add(start+b*beat,kick,.23)
        for b in (1,3):
            t=np.arange(int(.16*SR))/SR;noise=rng.normal(size=len(t));noise=np.convolve(noise,np.ones(4)/4,mode='same')
            add(start+b*beat,noise*np.exp(-t*35),.1)
        for b in range(8):
            t=np.arange(int(.06*SR))/SR;noise=rng.normal(size=len(t));noise=np.r_[0,np.diff(noise)]
            add(start+(b*.5+(.11 if b%2 else 0))*beat,noise*np.exp(-t*85),.017 if b%2 else .023)
        for j in range(2):
            at=start+(0.75+j*1.75)*beat;note=melody[(bar*2+j+(2 if bar>=8 else 0))%len(melody)]
            clip=tone(note,1.8,0);add(at,clip,.06);add(at+beat*.75,clip,.015)
    # Gentle low-pass softens percussion without a discontinuity at the loop seam.
    freqs=np.fft.rfftfreq(n,1/SR)
    x=np.fft.irfft(np.fft.rfft(x)/(1+(freqs/3400)**4),n=n)
    write(name,x)

print('Three new stereo lo-fi WAV loops generated.')
