"""Generate original periodic ambience; requires Python and NumPy. No samples."""
from pathlib import Path
import wave
import numpy as np
ROOT = Path(__file__).resolve().parents[1] / 'dist' / 'audio'
RATE, SECONDS = 22050, 24
N = RATE * SECONDS
rng = np.random.default_rng(73019)
t = np.arange(N) / RATE
f = np.fft.rfftfreq(N, 1 / RATE)
def noise(low, high, slope=0):
    spectrum = np.fft.rfft(rng.normal(size=N))
    weight = (np.maximum(f, 40) / 300) ** (-slope)
    weight *= (1 - np.exp(-(f / low) ** 4)) * np.exp(-(f / high) ** 4)
    out = np.fft.irfft(spectrum * weight, n=N)
    return out / np.std(out)
def write(name, data):
    # All components are periodic on this 24-second interval for smooth looping.
    data = data / max(np.max(np.abs(data)), 1) * .72
    with wave.open(str(ROOT / (name + '.wav')), 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(RATE)
        wav.writeframes((data * 32767).astype('<i2').tobytes())
rain = noise(350, 8500, .1) * (.42 + .025 * np.sin(2*np.pi*t/12))
# Circular, filtered little drops layered into steady rainfall.
drops = np.zeros(N)
for index in rng.integers(0, N, 170):
    length = int(.035 * RATE); u = np.arange(length)/RATE
    pulse = np.sin(2*np.pi*rng.uniform(1700,4200)*u)*np.exp(-u*150)*np.minimum(u*1500,1)
    np.add.at(drops, (index+np.arange(length))%N, pulse*rng.uniform(.06,.22))
write('rain',rain+drops)
wind = noise(70, 1900, .8) * (.28 + .11*np.sin(2*np.pi*t/24) + .045*np.sin(2*np.pi*t/8))
leaves = noise(1600,7500,.15) * (.07 + .04*np.sin(2*np.pi*t/6)**2)
write('forest',wind+leaves)
stream = noise(180,6500,.45)*(.30+.035*np.sin(2*np.pi*t/3))
for index in rng.integers(0,N,110):
    length=int(.16*RATE);u=np.arange(length)/RATE
    freq=rng.uniform(450,1250)
    bubble=np.sin(2*np.pi*(freq*u+900*u*u))*np.exp(-u*28)*np.minimum(u*600,1)
    np.add.at(stream,(index+np.arange(length))%N,bubble*rng.uniform(.06,.18))
write('stream',stream)
print('Created rain.wav, forest.wav and stream.wav (24-second loops).')
