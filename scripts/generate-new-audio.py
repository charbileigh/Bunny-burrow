"""Create four sample-free lo-fi loops and two distinctly different bells."""
from pathlib import Path
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "audio"
RATE = 22050
SECONDS = 24
rng = np.random.default_rng(20260910)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def add(track, start, sound, gain=1):
    first = int(start * RATE)
    if first >= len(track):
        return
    end = min(len(track), first + len(sound))
    track[first:end] += sound[:end-first] * gain


def tone(note, length, shape="sine", decay=3):
    t = np.arange(int(length * RATE)) / RATE
    phase = 2 * np.pi * hz(note) * t
    if shape == "triangle":
        signal = 2 / np.pi * np.arcsin(np.sin(phase))
    elif shape == "pluck":
        signal = np.sin(phase) + .35 * np.sin(2 * phase) + .16 * np.sin(3 * phase)
    elif shape == "square":
        signal = np.tanh(2.2 * np.sin(phase))
    elif shape == "box":
        signal = np.sin(phase) + .55 * np.sin(2.01 * phase) + .22 * np.sin(4.03 * phase)
    else:
        signal = np.sin(phase)
    return signal * (1 - np.exp(-t * 40)) * np.exp(-t * decay)


def kick():
    t = np.arange(int(.24 * RATE)) / RATE
    phase = 2 * np.pi * (44 * t + 42 * (1 - np.exp(-t * 35)) / 35)
    return np.sin(phase) * np.exp(-t * 18)


def hiss(length, decay=35):
    t = np.arange(int(length * RATE)) / RATE
    return np.r_[0, np.diff(rng.normal(size=len(t)))] * np.exp(-t * decay)


def save(name, mono, level=.72):
    mono = np.tanh(mono * 1.25)
    mono /= max(np.max(np.abs(mono)), .01)
    mono *= level
    with wave.open(str(ROOT / f"{name}.wav"), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes((mono * 32767).astype("<i2").tobytes())


def track():
    return np.zeros(SECONDS * RATE)


# Neon Bloom: quick synthwave pulse, four-on-the-floor kick and octave arpeggio.
neon = track()
beat = 60 / 112
chords = [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]]
for bar in range(12):
    start = bar * 4 * beat
    chord = chords[bar % 4]
    for step in range(16):
        note = chord[[0, 2, 1, 3][step % 4]] + 12 + (12 if step in (7, 15) else 0)
        add(neon, start + step * beat / 4, tone(note, .28, "square", 10), .045)
    for step in range(4):
        add(neon, start + step * beat, kick(), .22)
    add(neon, start, tone(chord[0] - 12, 1.7, "square", 2.8), .12)
save("lofi_neon_bloom", neon)


# Vinyl Keys: slow, sparse electric-piano seventh chords with brushed noise.
vinyl = track()
beat = 60 / 74
chords = [[50, 53, 57, 60, 64], [46, 50, 53, 57, 60], [48, 52, 55, 59, 62], [43, 47, 50, 53, 57]]
vinyl += rng.normal(size=len(vinyl)) * .003
for bar in range(8):
    start = bar * 4 * beat
    chord = chords[bar % 4]
    for i, note in enumerate(chord):
        add(vinyl, start + i * .018, tone(note, 3.6, "triangle", 1.0), .07)
    add(vinyl, start + 2.5 * beat, tone(chord[-1] + 12, 1.1, "sine", 2.5), .05)
    for step in (1, 3):
        add(vinyl, start + step * beat, hiss(.28, 18), .025)
save("lofi_vinyl_keys", vinyl, .68)


# Sleepy Strings: plucked acoustic-style pattern, no drums, long ringing tails.
strings = track()
beat = 60 / 66
patterns = [[45, 52, 57, 64, 60, 57], [41, 48, 53, 60, 57, 53], [48, 55, 60, 67, 64, 60]]
for bar in range(9):
    start = bar * 3 * beat
    notes = patterns[bar % 3]
    for step, note in enumerate(notes):
        add(strings, start + step * beat / 2, tone(note, 2.0, "pluck", 2.2), .09)
    add(strings, start, tone(notes[0] - 12, 2.5, "sine", 1.3), .08)
save("lofi_sleepy_strings", strings, .66)


# Petal Music Box: bright pentatonic melody in 6/8 with soft bell-like notes.
box = track()
beat = 60 / 92
melody = [72, 76, 79, 81, 79, 76, 74, 72, 69, 72, 76, 74]
for cycle in range(7):
    start = cycle * 6 * beat
    for step, note in enumerate(melody):
        add(box, start + step * beat / 2, tone(note, 1.25, "box", 3.4), .055)
    for note in [48, 55, 60]:
        add(box, start, tone(note, 3.2, "sine", .8), .035)
save("lofi_music_box", box, .62)


def bell(name, partials, length, strike=None):
    t = np.arange(int(length * RATE)) / RATE
    sound = np.zeros_like(t)
    for multiple, gain, decay in partials:
        sound += gain * np.sin(2 * np.pi * strike * multiple * t) * np.exp(-t * decay)
    sound *= 1 - np.exp(-t * 120)
    save(name, sound, .78)


bell("bell_temple", [(1, 1, .55), (1.51, .55, .9), (2.08, .28, 1.3), (2.95, .13, 1.8)], 5.0, 164)

twinkle = np.zeros(int(4.2 * RATE))
for delay, note in [(0, 84), (.18, 91), (.43, 88), (.72, 96)]:
    add(twinkle, delay, tone(note, 2.7, "box", 2.0), .28)
save("bell_twinkle", twinkle, .75)

print("Generated Neon Bloom, Vinyl Keys, Sleepy Strings, Petal Music Box, Temple Gong and Twinkle Bells.")
