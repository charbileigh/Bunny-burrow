# Bunny Burrow — updated offline PWA

This updates the existing Bunny Burrow mobile web app. It remains plain HTML,
CSS and JavaScript: host the supplied files over HTTPS, then install it from
your phone's browser. No native wrapper, server, build step or API key is needed.

## What changed

- Focus sound picker with seven ambient choices, nine lo-fi tracks or quiet focus.
- Bell picker: glass bell, soft chime or singing bowl.
- Preview buttons, separate sound and bell volume, and an ending-bell switch.
- All nineteen WAV audio files are bundled and cached for offline playback.
- HTML audio playback and Media Session controls for supported lock screens.
- Saved timer deadlines, bunny progress, sound choices and volume on this device.
- Correct timer catch-up after switching apps or reopening; no duplicate bunnies.
- Offline audio byte-range support for mobile browsers that seek within files.
- Updated offline cache version, preserving the existing pink/purple layout.

## Important: background versus fully closed

**Offline access does not make a PWA run after it has been closed.**

Start a session while the app is open. Some mobile browsers allow the selected
audio to continue when you switch apps or lock the screen. On supported phones,
the media panel can pause or resume the session. Other browsers or battery
settings may suspend audio or JavaScript, so a background bell can be delayed
or missed. Media Session provides controls, not a guarantee of background runtime.

If the user fully closes the PWA, force-stops the browser, or the phone removes
it from memory, audio stops and no offline alarm is guaranteed. There is no
service-worker timer or silent keep-alive workaround in this code. Service workers
cache files but cannot run indefinitely as an alarm service.

When reopened, the app reads saved clock deadlines. It credits the completed
focus session once, accounts for the break, and shows the current state. It
avoids replaying overdue bells. Tap **Resume sound** if the browser requires a
fresh interaction. This is timer recovery, not proof the app ran while closed.

Reliable closed-app offline alarms would require native phone capabilities;
this deliverable stays a PWA as requested.

## Replace the files on your existing host

1. Extract `Bunny-Burrow-Mobile-App.zip`.
2. Upload the extracted app files to the same folder as your existing PWA,
   replacing the old files and preserving the `audio` and `icons` folders.
3. Upload ALL files, including `sw.js`, `timer.js`, `mobile.js` and all nineteen WAVs.
4. Visit the hosted app online to let the browser download the update.
5. Close all Bunny Burrow tabs and app windows, then reopen the hosted app.
   If the old version remains, repeat after the update has downloaded.
6. Wait for **Ready offline** before going offline.

The new service worker uses cache version `mobile-9-distinct-lofi`. An update waits
until old app windows close so it does not replace files during a focus session.
Normal updates do not clear saved progress. Do not clear site data unless you
intend to reset the app's saved timer, settings and bunnies as well.

## GitHub Pages

Upload the extracted app files to the repository root, not the ZIP file.
`index.html`, `sw.js`, `style.css` and JavaScript files sit together, with `audio/`
and `icons/` alongside them.

For a new repository: **Settings → Pages → Deploy from a branch → main → /(root)
→ Save**. Open the HTTPS link shown by GitHub after publication completes.
An existing GitHub Pages repository keeps its current publishing settings.
Relative paths support a project URL under `/repository-name/`.

Official guide:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Install on a phone

- **Android:** open the HTTPS URL in Chrome. Use the app's install button when
  offered, or Chrome's menu → Install app / Add to Home screen.
- **iPhone/iPad:** open the HTTPS URL in Safari → Share → Add to Home Screen.
  If shown, enable Open as Web App, then tap Add.

The exact labels and installation support depend on the browser and OS version.
If already installed, the existing app receives the updated files after its
service worker update has activated; a second app installation is not needed.

## Using sounds

Choose a focus sound, use the adjacent play button for a six-second sample, then
start focusing. During focus, changing the sound picker switches the live audio.
Choose an ending bell and preview it independently. The bell switch controls
both focus-end and break-end bells; the preview button still lets you audition a
bell while the switch is off.

All sounds work without network access once offline setup is complete. They are
original synthesised sound textures, not recordings of a particular beach.
Beach includes gentle surf and faint gull-like tones; ocean has deeper swells;
fire has low crackle and pops. Bells are short musical tones.

On platforms that restrict programmatic audio volume, use the phone's physical
volume controls. Phone silent mode, other media, calls and browser playback
policies can affect what you hear.

## Saved state

The timer, preferences and bunny history are stored locally for this host/path.
They are not sent to a server or synced between devices. The latest 100 bunny
images are displayed while the total count remains saved. Clearing website data
or removing storage can erase this state. The app warns if device storage is
unavailable. Use one open window for playback to avoid competing audio.

## Files

- `index.html`, `style.css` — existing app design with new sound controls.
- `app.js` — UI, sound playback, previews, media controls and local saving.
- `timer.js` — independently testable timer state and deadline calculation.
- `mobile.js` — installation guidance and offline/update status.
- `sw.js` — versioned app/audio caching and offline byte-range responses.
- `manifest.webmanifest`, `icons/`, `bunny.png` — PWA identity and artwork.
- `audio/` — all sixteen focus loops and three bell files.
- `README.md` — hosting, upgrade and behaviour instructions.

## Local preview and future changes

For a quick layout preview, open `index.html`. Installation and offline caching
need HTTPS or localhost, not a file URL. With Python installed, serve the
extracted folder using `python3 -m http.server 8000`, then open
`http://localhost:8000` on that computer. Use your hosted HTTPS link on a phone.

For future releases, change `VERSION` in `sw.js` whenever app files change and
upload the full set. Keep new offline assets in its `ASSETS` list. There is no
installation/build command for the downloadable PWA.

## Validation and phone checks

Run `node tests.cjs` to check timer restoration, pause/resume, automatic breaks,
reward deduplication and offline audio ranges. JavaScript syntax and bundled
asset references were also checked during this update. Physical-phone background
playback and installation have not been tested here. Try a one-minute focus and
break, each sound, offline reopening and screen locking on your own phone.

## This update

The supplied ZIP already contained the sound pickers and offline timer model.
This revision preserves them and improves automatic audio resume on returning,
adds clear recovery messages after a focus session ends while away, prevents a
repeated media Play command from restarting a deadline, and refreshes the offline
cache. Existing version-3 saved sessions and bunny history are retained.

## Browser references

Media Session controls:
https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API

Service workers and their lifecycle:
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

Browser audio playback restrictions:
https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play

PWA installation:
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

## Added nature sounds

Gentle rain, forest breeze (wind and leaves), and flowing stream are original
synthesized 24-second loops, created directly from noise and tones. They are
not field recordings and contain no downloaded audio or third-party samples.
No third-party recording licence or attribution is required for these additions.
See AUDIO-NOTES.md and scripts/generate-ambience.py for provenance.
All sixteen focus sound options can be previewed, selected, saved and played offline.
Wait for the updated offline cache to finish before disconnecting.

## Lo-fi update

Added Petal study, Moonlit notes and Cocoa break (original instrumental lo-fi),
plus Forest trees (wind, rustling leaves and soft branch creaks). All prior
ambient sounds and the three ending bells remain available. New selections
use the existing previews, volume, saved preference and offline cache.
The included generators document how the sample-free audio was made.

## Softer bunny colours

Eight companions: Rosie (blush), Plum (mauve), Biscuit (beige), Pearl (white),
Cocoa (taupe), Mist (silver), Lilac and Peach. The former yellow and green
choices now use neutral beige and pearl filters. Colours use the original
watercolour artwork with gentle CSS filters; no extra images need downloading.
The two-row picker fits mobile screens and each colour has an accessible name.
Existing rewards stay saved. Previously earned Honey/Clover bunnies appear in
their new Biscuit/Pearl colours. All sixteen sounds and three bells remain included.

## Additional playable lo-fi tracks

Rainy Window, Lavender Evening and Sunday Sketchbook are now part of the app,
rather than being supplied only as separate WAV downloads. They appear under
the Lo-fi music group in the sound picker, use the adjacent preview button,
play during focus sessions and are cached for offline use. Preview playback now
loads a fully resolved file URL, restarts at the beginning and reports whether
the selected track is playing or could not load.

## Distinct lo-fi update

Jazz-hop Café, Cloud Waltz and Pixel Night were designed to sound clearly
different from the mellow tracks already included. They use different tempos,
meters, instruments and drum patterns: swung jazz-hop, a drumless 3/4 waltz,
and brighter electronic lo-fi. All three use the same preview, saved-selection
and offline features as the rest of the sound library.
