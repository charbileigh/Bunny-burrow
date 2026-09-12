# New audio provenance

- audio/rain.wav — Gentle rain; filtered noise and soft synthetic drops.
- audio/forest.wav — Forest breeze; low wind and higher leaf rustle textures.
- audio/stream.wav — Flowing stream; filtered noise and bubbling tones.

Created for this app using the included deterministic Python generator.
No third-party audio, recordings, samples, music or sound libraries were used.
These additions need no third-party recording licence, royalty payment or
attribution. They are synthetic ambience, not recordings of real locations.
This note applies to the three new files; existing supplied audio is preserved.

Generator: scripts/generate-ambience.py (Python 3 and NumPy).
Place the app files in a dist folder alongside scripts to regenerate.
Runtime playback requires no Python or NumPy.

## Lo-fi and Forest trees additions

- lofi_petal.wav — Petal study: soft electric-piano chords and a relaxed 75 BPM beat.
- lofi_moon.wav — Moonlit notes: mellow minor chords and a slower 68 BPM beat.
- lofi_cocoa.wav — Cocoa break: warm keyboard tones and an 80 BPM beat.
- forest_trees.wav — Forest trees: leaf rustle, wind and soft synthetic branch creaks.

All four were composed/synthesized for this app from mathematical tones and
noise, with no third-party samples, recordings or copied melodies. No
third-party recording licence, royalty or attribution is required. The three
music loops have eight bars; Forest trees loops over 32 seconds. These are
synthetic textures, not field recordings. Generator: scripts/generate-lofi.py.

## Additional lo-fi tracks

- `lofi_rainy_window.wav` — Rainy Window, 66 BPM and mellow.
- `lofi_lavender_evening.wav` — Lavender Evening, 72 BPM with soft chords.
- `lofi_sunday_sketchbook.wav` — Sunday Sketchbook, 84 BPM and lightly upbeat.

These three stereo PCM WAV loops were also composed and synthesized for this
app without third-party samples or copied melodies. Their source generator is
included as `scripts/generate-additional-lofi.py`.

## Three deliberately different lo-fi styles

- `lofi_jazz_cafe.wav` — Jazz-hop Café: 78 BPM, 4/4, swung brushes,
  extended jazz chords and walking bass.
- `lofi_cloud_waltz.wav` — Cloud Waltz: 64 BPM, 3/4, floating pads,
  bell arpeggios and no drum kit.
- `lofi_pixel_night.wav` — Pixel Night: 108 BPM, 4/4, bright pulse-wave
  arpeggios, syncopated bass and crisp electronic drums.

These tracks intentionally use different meters, tempos, instrumentation and
rhythmic patterns. They were synthesized without third-party samples or copied
melodies. Source: `scripts/generate-distinct-lofi.py`.

## Live-controls audio additions

- `lofi_neon_bloom.wav` — 112 BPM synthwave pulse with four-on-the-floor drums.
- `lofi_vinyl_keys.wav` — sparse 74 BPM electric-piano seventh chords and vinyl texture.
- `lofi_sleepy_strings.wav` — drumless 66 BPM acoustic-style plucked strings.
- `lofi_music_box.wav` — bright 92 BPM music-box melody in 6/8.
- `bell_temple.wav` — a low, five-second temple-style gong.
- `bell_twinkle.wav` — a short cascade of four high chimes.

These additions were composed and synthesized with the deterministic
`scripts/generate-new-audio.py` generator. They contain no downloaded or
third-party recordings, samples, or copied melodies.

## Jazz, synthwave, chillwave and bell expansion

- `jazz_velvet_swing.wav` — Velvet Swing: 80 BPM major-key swing with clean
  warm keys, walking upright-style bass, brushes and a soft ride pattern.
- `jazz_bossa_bloom.wav` — Bossa Bloom: 120 BPM major-key bossa nova with
  light clean-guitar voicings, syncopated bass, clave and shaker.
- `jazz_midnight_sax.wav` — Sunday Sax: 100 BPM friendly major-key jazz with a
  smooth reed lead, warm piano voicings and restrained brushed drums.
- `jazz_brass_parade.wav` — Garden Brass: cheerful 100 BPM jazz with rounded
  horn phrases, a buoyant bass line and a soft backbeat.
- `jazz_piano_ballad.wav` — Morning Piano: a bright, drumless 60 BPM piano
  piece with simple major-seventh harmony and a gentle bass line.
- `synthwave_arcade_drive.wav` — Candy Circuit: clean, upbeat 120 BPM
  major-key arpeggios, rounded bass and softened electronic drums.
- `synthwave_cosmic_drift.wav` — Starlight Float: airy 60 BPM major-key pads,
  sparkling clean notes and a minimal pulse without dark drones or heavy toms.
- `chillwave_sunset_tape.wav` — hazy 80 BPM detuned pads, glass plucks,
  synthetic tape dust and a lazy backbeat.
- `chillwave_aqua_dream.wav` — drumless 60 BPM 3/4 pads, watery glass tones
  and soft synthetic bubbles.
- `chillwave_pastel_dusk.wav` — 90 BPM chopped keyboard chords,
  syncopated bass and a gentle breakbeat.
- `bell_harbour.wav` — two low, slowly decaying inharmonic bell strikes.
- `bell_clock_duet.wav` — a concise bright high/low two-note clock chime.

All twelve files were composed and synthesized specifically for Bunny Burrow
from mathematical oscillators and seeded noise. They contain no downloaded
recordings, samples, copied melodies, or third-party sound libraries. The
deterministic generator is `scripts/generate-jazz-wave-audio.py` (Python 3 and
NumPy); runtime playback requires neither Python nor NumPy.
