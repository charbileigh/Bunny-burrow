"""Generate three deliberately different, sample-free Bunny Burrow lo-fi loops."""
from pathlib import Path
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "dist" / "audio"
RATE = 22050
rng = np.random.default_rng(260908)


def midi_hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def voice(note, seconds, timbre="rhodes", release=2.0):
    t = np.arange(max(1, int(seconds * RATE))) / RATE
    f = midi_hz(note)
    attack = 1 - np.exp(-t * 45)
    envelope = attack * np.exp(-t * release)
    if timbre == "rhodes":
        signal = np.sin(2 * np.pi * f * t)
        signal += 0.27 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 2.5)
        signal += 0.08 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5)
    elif timbre == "cloud":
        signal = sum(np.sin(2 * np.pi * f * (1 + detune) * t) for detune in (-0.004, 0, 0.004)) / 3
        signal += 0.13 * np.sin(2 * np.pi * f * 0.5 * t)
        envelope = (1 - np.exp(-t * 8)) * np.exp(-t * release)
    elif timbre == "bell":
        signal = np.sin(2 * np.pi * f * t)
        signal += 0.5 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 2)
        signal += 0.18 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 4)
    else:  # Rounded pulse wave for the brighter pixel track.
        signal = np.tanh(2.1 * np.sin(2 * np.pi * f * t))
        signal += 0.18 * np.sin(2 * np.pi * f * 0.5 * t)
    return signal * envelope


def canvas(bpm, bars, beats_per_bar):
    beat = 60 / bpm
    size = round(bars * beats_per_bar * beat * RATE)
    return beat, np.zeros(size)


def add(loop, when, clip, gain=1.0):
    indexes = (round(when * RATE) + np.arange(len(clip))) % len(loop)
    np.add.at(loop, indexes, clip * gain)


def noise_hit(seconds, decay, highpass=False):
    t = np.arange(max(1, int(seconds * RATE))) / RATE
    noise = rng.normal(size=len(t))
    if highpass:
        noise = np.r_[0, np.diff(noise)]
    else:
        noise = np.convolve(noise, np.ones(7) / 7, mode="same")
    return noise * np.exp(-t * decay)


def finish(name, mono, cutoff, stereo_delay):
    frequencies = np.fft.rfftfreq(len(mono), 1 / RATE)
    mono = np.fft.irfft(np.fft.rfft(mono) / (1 + (frequencies / cutoff) ** 6), n=len(mono))
    mono = np.tanh(mono * 1.2)
    mono /= max(np.max(np.abs(mono)), 0.01)
    delayed = np.roll(mono, int(stereo_delay * RATE))
    stereo = np.stack((mono * 0.94 + delayed * 0.06, delayed * 0.94 + mono * 0.06), axis=1) * 0.68
    with wave.open(str(ROOT / f"{name}.wav"), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes((stereo * 32767).astype("<i2").tobytes())


# 1. Jazz-hop café: 4/4, swung brushes, extended chords and walking bass.
beat, jazz = canvas(78, 12, 4)
jazz_chords = [
    [50, 53, 57, 60, 64], [43, 53, 57, 59, 64],
    [48, 52, 55, 59, 62], [45, 49, 52, 55, 58],
]
for bar in range(12):
    start = bar * 4 * beat
    chord = jazz_chords[bar % len(jazz_chords)]
    for offset, level in ((0, 0.065), (2.7, 0.045)):
        for i, note in enumerate(chord):
            add(jazz, start + offset * beat + i * 0.012, voice(note, 3.1, "rhodes", 1.25), level)
    bass_line = [chord[0] - 12, chord[1] - 12, chord[2] - 12, chord[3] - 12]
    for step, note in enumerate(bass_line):
        add(jazz, start + step * beat, voice(note, 0.9, "rhodes", 3.2), 0.15)
    for step in range(8):
        swing = 0.16 if step % 2 else 0
        add(jazz, start + (step * 0.5 + swing) * beat, noise_hit(0.07, 85, True), 0.018)
    for step in (1, 3):
        add(jazz, start + step * beat, noise_hit(0.3, 19), 0.055)
    kick_t = np.arange(int(0.22 * RATE)) / RATE
    kick = np.sin(2 * np.pi * (48 * kick_t + 42 * (1 - np.exp(-kick_t * 32)) / 32)) * np.exp(-kick_t * 17)
    add(jazz, start, kick, 0.19)
    add(jazz, start + 2.5 * beat, kick, 0.11)
finish("lofi_jazz_cafe", jazz, 3900, 0.041)


# 2. Cloud waltz: 3/4, floating pads and bells, deliberately no drum kit.
beat, waltz = canvas(64, 12, 3)
waltz_chords = [[53, 57, 60, 64], [45, 48, 52, 55], [50, 53, 57, 60], [46, 50, 53, 57]]
for bar in range(12):
    start = bar * 3 * beat
    chord = waltz_chords[bar % len(waltz_chords)]
    for note in chord:
        add(waltz, start, voice(note, 4.0, "cloud", 0.42), 0.045)
    arpeggio = [chord[0], chord[2], chord[1], chord[3], chord[2], chord[1]]
    for step, note in enumerate(arpeggio):
        add(waltz, start + step * 0.5 * beat, voice(note + 12, 1.2, "bell", 2.8), 0.047)
    if bar % 2 == 1:
        add(waltz, start + 1.5 * beat, voice(chord[-1] + 19, 2.0, "bell", 1.9), 0.035)
finish("lofi_cloud_waltz", waltz, 5200, 0.085)


# 3. Pixel night: 4/4, faster pulse arpeggio, syncopated bass and crisp drums.
beat, pixel = canvas(108, 16, 4)
pixel_chords = [[45, 48, 52, 57], [41, 45, 48, 52], [48, 52, 55, 59], [43, 47, 50, 55]]
for bar in range(16):
    start = bar * 4 * beat
    chord = pixel_chords[bar % len(pixel_chords)]
    pattern = [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 1, 0, 3, 2, 1]
    for step, chord_index in enumerate(pattern):
        note = chord[chord_index] + 12 + (12 if step in (7, 15) else 0)
        add(pixel, start + step * 0.25 * beat, voice(note, 0.28, "pixel", 9), 0.042)
    for offset, note in ((0, chord[0] - 12), (1.5, chord[2] - 12), (2.75, chord[1] - 12)):
        add(pixel, start + offset * beat, voice(note, 0.55, "pixel", 5.5), 0.12)
    kick_t = np.arange(int(0.17 * RATE)) / RATE
    kick = np.sin(2 * np.pi * (55 * kick_t + 48 * (1 - np.exp(-kick_t * 40)) / 40)) * np.exp(-kick_t * 22)
    add(pixel, start, kick, 0.24)
    add(pixel, start + 2.5 * beat, kick, 0.16)
    for step in (1, 3):
        add(pixel, start + step * beat, noise_hit(0.12, 42, True), 0.045)
finish("lofi_pixel_night", pixel, 6500, 0.023)

print("Generated Jazz-hop Café, Cloud Waltz and Pixel Night.")
