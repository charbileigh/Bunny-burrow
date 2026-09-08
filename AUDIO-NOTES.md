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
