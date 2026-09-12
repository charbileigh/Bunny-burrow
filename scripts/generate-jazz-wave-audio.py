"""Generate ten distinct music loops and two bells for Bunny Burrow.

Every sound is composed from deterministic mathematical oscillators and noise.
There are no samples, downloads, copied melodies, or third-party audio assets.
"""

from pathlib import Path
import wave

import numpy as np


ROOT = Path(__file__).resolve().parents[1] / "audio"
RATE = 22_050
DURATION = 24.0
SAMPLES = int(RATE * DURATION)
rng = np.random.default_rng(20260912)


def midi_hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def adsr(t, attack=.02, release=.25):
    envelope = np.minimum(1.0, t / max(attack, 1 / RATE))
    envelope *= np.minimum(1.0, (t[-1] - t + 1 / RATE) / max(release, 1 / RATE))
    return np.clip(envelope, 0, 1)


def voice(note, seconds, timbre="rhodes", decay=None):
    t = np.arange(max(1, round(seconds * RATE))) / RATE
    frequency = midi_hz(note)
    vibrato = 1 + .0025 * np.sin(2 * np.pi * 5.1 * t)
    phase = 2 * np.pi * frequency * t * vibrato

    if timbre == "rhodes":
        signal = np.sin(phase) + .28 * np.sin(2.01 * phase) * np.exp(-t * 2.8)
        signal += .08 * np.sin(3.97 * phase) * np.exp(-t * 5)
        decay = 1.2 if decay is None else decay
    elif timbre == "piano":
        signal = np.sin(phase) + .48 * np.sin(2 * phase) + .18 * np.sin(3.01 * phase)
        signal += .08 * np.sin(5.02 * phase)
        decay = 1.45 if decay is None else decay
    elif timbre == "nylon":
        signal = np.sin(phase) + .34 * np.sin(2 * phase) + .14 * np.sin(3 * phase)
        signal += .05 * np.sin(5 * phase)
        decay = 3.6 if decay is None else decay
    elif timbre == "upright":
        signal = np.sin(phase) + .42 * np.sin(2 * phase) + .16 * np.sin(3 * phase)
        signal *= 1 + .06 * np.sin(2 * np.pi * 2.2 * t)
        decay = 2.5 if decay is None else decay
    elif timbre == "sax":
        breath = np.convolve(rng.normal(size=len(t)), np.ones(17) / 17, mode="same")
        signal = np.sin(phase + 1.5 * np.sin(phase * .5)) + .24 * np.sin(2 * phase)
        signal += .035 * breath
        decay = .16 if decay is None else decay
    elif timbre == "brass":
        signal = np.tanh(1.8 * (np.sin(phase) + .42 * np.sin(2 * phase) + .2 * np.sin(3 * phase)))
        decay = .25 if decay is None else decay
    elif timbre == "organ":
        signal = np.sin(phase) + .34 * np.sin(2 * phase) + .18 * np.sin(3 * phase)
        decay = 0 if decay is None else decay
    elif timbre == "pulse":
        signal = np.tanh(2.7 * np.sin(phase)) + .12 * np.sin(.5 * phase)
        decay = 0 if decay is None else decay
    elif timbre == "pad":
        signal = sum(np.sin(phase * ratio) for ratio in (.996, 1, 1.004)) / 3
        signal += .16 * np.sin(.5 * phase)
        decay = 0 if decay is None else decay
    elif timbre == "glass":
        signal = np.sin(phase) + .55 * np.sin(2.01 * phase) * np.exp(-t * 1.8)
        signal += .22 * np.sin(4.08 * phase) * np.exp(-t * 4.5)
        decay = 1.8 if decay is None else decay
    else:
        signal = np.sin(phase)
        decay = 0 if decay is None else decay

    envelope = adsr(t, .008 if timbre not in ("pad", "sax") else .12, .15 if timbre != "pad" else .8)
    if decay:
        envelope *= np.exp(-t * decay)
    return signal * envelope


def add(track, start, clip, gain=1.0):
    """Mix a clip into a circular loop without cutting notes at the seam."""
    position = round(start * RATE) % len(track)
    offset = 0
    while offset < len(clip):
        count = min(len(track) - position, len(clip) - offset)
        track[position:position + count] += clip[offset:offset + count] * gain
        offset += count
        position = 0


def add_chord(track, start, notes, seconds, timbre, gain, spread=.012):
    for index, note in enumerate(notes):
        add(track, start + index * spread, voice(note, seconds, timbre), gain)


def filtered_noise(seconds, smooth=1, highpass=False):
    noise = rng.normal(size=max(1, round(seconds * RATE)))
    if smooth > 1:
        noise = np.convolve(noise, np.ones(smooth) / smooth, mode="same")
    if highpass:
        noise = np.r_[0, np.diff(noise)]
    return noise


def kick(seconds=.28):
    t = np.arange(round(seconds * RATE)) / RATE
    phase = 2 * np.pi * (44 * t + 55 * (1 - np.exp(-t * 34)) / 34)
    return np.sin(phase) * np.exp(-t * 17)


def snare(seconds=.25, soft=False):
    t = np.arange(round(seconds * RATE)) / RATE
    noise = filtered_noise(seconds, 2, True)
    tone = np.sin(2 * np.pi * (175 if soft else 205) * t)
    return (noise * (.55 if soft else .8) + tone * .2) * np.exp(-t * (18 if soft else 24))


def brush(seconds=.35):
    t = np.arange(round(seconds * RATE)) / RATE
    return filtered_noise(seconds, 11, True) * np.exp(-t * 10)


def hat(seconds=.08):
    t = np.arange(round(seconds * RATE)) / RATE
    return filtered_noise(seconds, 1, True) * np.exp(-t * 65)


def rim():
    t = np.arange(round(.075 * RATE)) / RATE
    return (np.sin(2 * np.pi * 820 * t) + .35 * filtered_noise(.075, 1, True)) * np.exp(-t * 58)


def tom(note=43, seconds=.4):
    t = np.arange(round(seconds * RATE)) / RATE
    phase = 2 * np.pi * midi_hz(note) * t * (1 + .035 * np.exp(-t * 9))
    return np.sin(phase) * np.exp(-t * 9)


def canvas():
    return np.zeros(SAMPLES, dtype=np.float64)


def soften(signal, cutoff=7_000):
    frequencies = np.fft.rfftfreq(len(signal), 1 / RATE)
    return np.fft.irfft(np.fft.rfft(signal) / (1 + (frequencies / cutoff) ** 8), n=len(signal))


def save(name, signal, level=.7, cutoff=7_000):
    signal = soften(signal - np.mean(signal), cutoff)
    signal = np.tanh(signal * 1.3)
    signal /= max(np.max(np.abs(signal)), .01)
    # A tiny zero-crossing seam prevents clicks even in strict WAV loopers.
    seam = max(2, round(.018 * RATE))
    signal[:seam] *= np.linspace(0, 1, seam)
    signal[-seam:] *= np.linspace(1, 0, seam)
    signal *= level
    with wave.open(str(ROOT / f"{name}.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes((signal * 32_767).astype("<i2").tobytes())


# Jazz 1 — 80 BPM swing, brushed kit, walking bass and Rhodes ninths.
track = canvas()
beat = 60 / 80
progression = [
    [50, 53, 57, 60, 64], [55, 59, 62, 65, 69],
    [48, 52, 55, 59, 62], [45, 49, 52, 55, 58],
]
for bar in range(8):
    start = bar * 4 * beat
    chord = progression[bar % 4]
    add_chord(track, start, chord, 3.6, "rhodes", .052)
    add_chord(track, start + 2.62 * beat, chord[1:], 1.2, "rhodes", .034)
    for step, note in enumerate([chord[0] - 12, chord[1] - 12, chord[2] - 12, chord[3] - 12]):
        add(track, start + step * beat, voice(note, .78, "upright"), .13)
    for step in range(8):
        swing = .15 if step % 2 else 0
        add(track, start + (step / 2 + swing) * beat, hat(.075), .012)
    for step in (1, 3):
        add(track, start + step * beat, brush(), .034)
    add(track, start, kick(), .14)
    add(track, start + 2.5 * beat, kick(), .08)
save("jazz_velvet_swing", track, .69, 4_800)


# Jazz 2 — 120 BPM bossa nova with nylon syncopation, clave and shaker.
track = canvas()
beat = 60 / 120
progression = [
    [53, 57, 60, 64, 69], [52, 55, 59, 62, 67],
    [50, 53, 57, 60, 64], [55, 59, 62, 65, 69],
]
for bar in range(12):
    start = bar * 4 * beat
    chord = progression[bar % 4]
    for offset in (0, 1.5, 2.5, 3.5):
        add_chord(track, start + offset * beat, chord, .75, "nylon", .044, .007)
    for offset, note in ((0, chord[0] - 12), (1.5, chord[2] - 12), (2, chord[0] - 12), (3.5, chord[3] - 12)):
        add(track, start + offset * beat, voice(note, .48, "upright"), .12)
    for step in range(8):
        add(track, start + step * beat / 2, hat(.055), .009 if step % 2 else .014)
    for offset in (0, 1.5, 2.5):
        add(track, start + offset * beat, rim(), .036)
save("jazz_bossa_bloom", track, .67, 5_600)


# Jazz 3 — 90 BPM modal night-club lead with breathy sax and sparse ride.
track = canvas()
beat = 60 / 90
chords = [[45, 48, 52, 55, 59], [50, 53, 57, 60, 64], [43, 47, 50, 53, 57]]
phrases = [69, 72, 74, 76, 74, 72, 67, 69, 65, 67, 69, 72]
for bar in range(9):
    start = bar * 4 * beat
    chord = chords[bar % 3]
    add_chord(track, start, chord, 3.5, "organ", .026)
    add(track, start, voice(chord[0] - 12, 1.25, "upright"), .14)
    add(track, start + 2 * beat, voice(chord[2] - 12, 1.2, "upright"), .11)
    for step in range(4):
        note = phrases[(bar * 4 + step) % len(phrases)] + (12 if bar in (4, 8) and step == 3 else 0)
        add(track, start + (step + (.18 if step % 2 else 0)) * beat, voice(note, .68, "sax"), .052)
    for step in range(4):
        add(track, start + step * beat, hat(.16), .009)
    add(track, start + 2 * beat, brush(.42), .022)
save("jazz_midnight_sax", track, .68, 5_200)


# Jazz 4 — 120 BPM second-line parade with tuba, brass stabs and marching snare.
track = canvas()
beat = 60 / 120
progression = [[48, 52, 55, 58], [53, 57, 60, 63], [55, 59, 62, 65]]
for bar in range(24):
    start = bar * 2 * beat
    chord = progression[(bar // 2) % 3]
    for offset, notes in ((0, chord), (.72, [note + 12 for note in chord[1:]]), (1.5, chord)):
        add_chord(track, start + offset * beat, notes, .34, "brass", .035, .006)
    add(track, start, voice(chord[0] - 24, .44, "brass"), .13)
    add(track, start + beat, voice(chord[2] - 24, .4, "brass"), .11)
    for step in range(4):
        add(track, start + step * beat / 2, snare(.11), .025 if step % 2 else .038)
    add(track, start, kick(.2), .15)
save("jazz_brass_parade", track, .66, 6_200)


# Jazz 5 — 60 BPM drumless 3/4 piano ballad with wide, slow voicings.
track = canvas()
beat = 1.0
progression = [
    [48, 52, 55, 59, 64], [45, 48, 52, 55, 60],
    [50, 53, 57, 60, 65], [43, 47, 50, 53, 59],
]
melody = [72, 74, 76, 71, 69, 72, 77, 76, 74, 71, 67, 69]
for bar in range(8):
    start = bar * 3 * beat
    chord = progression[bar % 4]
    add_chord(track, start, chord, 4.6, "piano", .042, .025)
    for step, index in enumerate((0, 2, 4, 1, 3, 2)):
        add(track, start + step * beat / 2, voice(chord[index] + 12, 1.2, "piano"), .044)
    add(track, start + .35 * beat, voice(melody[(bar * 2) % len(melody)], 1.4, "piano"), .038)
    add(track, start + 1.7 * beat, voice(melody[(bar * 2 + 1) % len(melody)], 1.5, "piano"), .035)
save("jazz_piano_ballad", track, .64, 4_700)


# Synthwave 1 — 120 BPM arcade drive with sixteenth-note pulse and gated bass.
track = canvas()
beat = 60 / 120
progression = [[45, 48, 52, 57], [41, 45, 48, 52], [48, 52, 55, 60], [43, 47, 50, 55]]
for bar in range(12):
    start = bar * 4 * beat
    chord = progression[bar % 4]
    pattern = [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 1, 0, 3, 2, 1]
    for step, index in enumerate(pattern):
        add(track, start + step * beat / 4, voice(chord[index] + 12, .16, "pulse"), .026)
    for step in range(8):
        add(track, start + step * beat / 2, voice(chord[0] - 12 + (12 if step in (3, 7) else 0), .22, "pulse"), .065)
    for step in range(4):
        add(track, start + step * beat, kick(.2), .17)
    for step in (1, 3):
        add(track, start + step * beat, snare(.22), .04)
save("synthwave_arcade_drive", track, .68, 6_500)


# Synthwave 2 — 60 BPM half-time cosmic pads, slow lead and toms; no arpeggio.
track = canvas()
beat = 1.0
progression = [[41, 48, 53, 57], [45, 52, 57, 60], [38, 45, 50, 53]]
lead = [65, 69, 72, 76, 74, 69, 67, 64, 62]
for bar in range(6):
    start = bar * 4 * beat
    chord = progression[bar % 3]
    add_chord(track, start, chord, 6.2, "pad", .035, .04)
    add(track, start, voice(chord[0] - 12, 3.6, "pulse"), .045)
    add(track, start + .6 * beat, voice(lead[bar % len(lead)], 2.2, "sax"), .025)
    add(track, start + 2.55 * beat, voice(lead[(bar + 3) % len(lead)], 1.35, "sax"), .022)
    add(track, start, kick(.42), .1)
    add(track, start + 2 * beat, tom(38, .7), .09)
save("synthwave_cosmic_drift", track, .66, 5_000)


# Chillwave 1 — 80 BPM sun-warmed detuned pads, tape dust and lazy backbeat.
track = filtered_noise(DURATION, 19) * .003
beat = 60 / 80
progression = [[48, 52, 55, 59], [45, 48, 52, 57], [53, 57, 60, 64], [50, 53, 57, 60]]
for bar in range(8):
    start = bar * 4 * beat
    chord = progression[bar % 4]
    add_chord(track, start, chord, 5.4, "pad", .037, .03)
    for offset, note in ((.5, chord[2] + 12), (1.75, chord[1] + 12), (3.25, chord[3] + 12)):
        add(track, start + offset * beat, voice(note, .9, "glass"), .025)
    add(track, start, kick(.32), .09)
    add(track, start + 2 * beat, snare(.34, True), .027)
save("chillwave_sunset_tape", track, .64, 4_300)


# Chillwave 2 — 60 BPM 3/4 aqua dream with watery glass tones and no drums.
track = canvas()
beat = 1.0
progression = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 60, 65, 69], [48, 55, 60, 64]]
for bar in range(8):
    start = bar * 3 * beat
    chord = progression[bar % 4]
    add_chord(track, start, chord, 4.8, "pad", .026, .04)
    pattern = [0, 2, 1, 3, 2, 1]
    for step, index in enumerate(pattern):
        add(track, start + step * beat / 2, voice(chord[index] + 12, 1.65, "glass"), .034)
    bubble = filtered_noise(.28, 31)
    bubble *= np.sin(np.linspace(0, np.pi, len(bubble)))
    add(track, start + 2.35 * beat, bubble, .018)
save("chillwave_aqua_dream", track, .62, 5_700)


# Chillwave 3 — 90 BPM pastel chopped chords and a syncopated breakbeat.
track = canvas()
beat = 60 / 90
progression = [[43, 50, 55, 59], [48, 55, 60, 64], [45, 52, 57, 60]]
for bar in range(9):
    start = bar * 4 * beat
    chord = progression[bar % 3]
    for offset in (.25, 1.25, 2.0, 3.35):
        add_chord(track, start + offset * beat, chord, .46, "rhodes", .035, .008)
    for offset, note in ((0, chord[0] - 12), (1.75, chord[2] - 12), (3, chord[1] - 12)):
        add(track, start + offset * beat, voice(note, .52, "upright"), .08)
    for offset in (0, 2.5):
        add(track, start + offset * beat, kick(.25), .11)
    for offset in (1, 3):
        add(track, start + offset * beat, snare(.24, True), .031)
    for step in (1, 3, 6):
        add(track, start + step * beat / 2, hat(.06), .008)
save("chillwave_pastel_dusk", track, .65, 4_900)


def inharmonic_bell(frequency, seconds, partials):
    t = np.arange(round(seconds * RATE)) / RATE
    signal = np.zeros_like(t)
    for multiple, gain, decay in partials:
        signal += gain * np.sin(2 * np.pi * frequency * multiple * t) * np.exp(-t * decay)
    return signal * (1 - np.exp(-t * 120))


# Deep, slowly swinging harbour bell with two heavy strikes.
bell = np.zeros(round(6.5 * RATE))
strike = inharmonic_bell(110, 6.2, [(1, 1, .48), (1.41, .58, .72), (2.09, .32, 1.0), (2.73, .2, 1.4)])
bell[:len(strike)] += strike
second = inharmonic_bell(110, 4.1, [(1, 1, .62), (1.41, .52, .9), (2.09, .3, 1.3)])
offset = round(2.35 * RATE)
bell[offset:offset + len(second)] += second[:len(bell) - offset] * .55
save("bell_harbour", bell, .76, 4_000)


# Bright two-note clock chime: a concise high ding followed by a lower dong.
bell = np.zeros(round(3.4 * RATE))
ding = inharmonic_bell(midi_hz(84), 2.4, [(1, 1, 1.8), (2.01, .48, 2.7), (3.96, .2, 4.0)])
dong = inharmonic_bell(midi_hz(77), 2.65, [(1, 1, 1.35), (2.02, .42, 2.1), (4.07, .16, 3.6)])
bell[:len(ding)] += ding
offset = round(.62 * RATE)
bell[offset:offset + len(dong)] += dong[:len(bell) - offset] * .92
save("bell_clock_duet", bell, .73, 6_000)


print("Generated five jazz loops, two synthwave loops, three chillwave loops, and two bells.")
