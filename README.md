# Bunny Burrow — installable mobile app

Bunny Burrow is a Progressive Web App (PWA). Host the supplied static files over
HTTPS, then add the app to your Android or iPhone home screen. It opens in its
own standalone window on supported devices.

The app includes pink light mode, purple dark mode, four bunny colours, growth
through each focus session, generated crackling fire audio, an ending bell,
automatic breaks, pause/reset, adjustable durations and mobile installation help.

## Quick start: host with GitHub Pages

1. Extract `Bunny-Burrow-Mobile-App.zip` on your computer.
2. Create a GitHub repository, for example `bunny-burrow-mobile`.
3. Upload ALL the extracted app files and the `icons` folder into the repository
   root. Upload the files themselves, not the ZIP. `index.html` and `sw.js` must
   sit together at the top level.
4. In the repository, open **Settings → Pages**.
5. Set Source to **Deploy from a branch**, select **main** and **/(root)**,
   then select **Save**.
6. Wait for publishing to finish and open the HTTPS URL shown by GitHub Pages.
7. Wait until the app displays **Ready offline** before disconnecting or installing.

The relative manifest and service-worker paths support GitHub Pages project
URLs such as `https://YOUR-USERNAME.github.io/bunny-burrow-mobile/` as well as
hosting at a domain root. The example URL is a template, not a deployed site.

Official GitHub Pages setup:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Install on your phone

### Android

Open your hosted HTTPS URL in Chrome. Tap **Add to your phone** inside the app.
When Chrome offers installation, the button becomes **Install Bunny Burrow**.
Alternatively, use Chrome's menu and choose **Install app** or **Add to Home
screen**. The available labels and installation behaviour vary by browser.

### iPhone / iPad

Open your hosted HTTPS URL in Safari. Tap **Share → Add to Home Screen**.
If an **Open as Web App** option appears, turn it on, then tap **Add**.
Launch Bunny Burrow using its new home-screen icon.

Installation requirements and browser support:
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

## Other static hosting

Use any HTTPS static host. No build command, package installation, backend,
API keys or database is required. Publish the directory containing `index.html`.
If you are using this Git repository rather than the download ZIP, the public
files are in `dist/`; publish that folder.

Keep the complete directory structure. Serve `.js` files with a JavaScript MIME
type and `manifest.webmanifest` as `application/manifest+json` or `application/json`.
Do not redirect `sw.js` or other asset URLs to an HTML fallback.

## Local development

For a quick view, open `index.html`. Installation and service workers require
an HTTPS host or a local development server; they do not work from a file URL.

If Python is installed, run this inside the extracted app folder:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000` on that same computer. A plain HTTP LAN address
on a phone is not a substitute for HTTPS; use the hosted HTTPS link for phone
installation and offline testing.

## Files in the downloadable package

- `index.html` — app screen and installation help
- `style.css` — themes, responsive design, safe-area spacing, touch targets
- `app.js` — focus/break timer, bunny growth, sound and screen wake-lock handling
- `mobile.js` — installation controls and offline readiness
- `manifest.webmanifest` — app identity, home-screen launch and icons
- `sw.js` — versioned, scope-specific offline app cache
- `bunny.png` — bundled bunny artwork
- `icons/` — 192px, 512px, maskable and Apple touch icons
- `README.md` — this guide

There are no missing audio files: fire and bell audio are synthesised in the
browser. System fonts keep text available offline with no external font calls.
The artwork and all files needed to use the timer are bundled.

## How the mobile timer behaves

Tap **Start focusing** to allow browser audio. Keep Bunny Burrow visible for
reliable fire sounds and the finishing bell. A supported screen wake lock is
requested during a running timer, but the operating system can release it.

Phones may stop JavaScript and audio when the screen locks, the app is put in
the background, or the operating system closes it. This PWA does not schedule
native background alarms or push notifications. It must not be relied on for
a guaranteed locked-screen bell.

If the page remains open in memory, returning to it reconciles the original
clock deadlines: a completed focus session grows one bunny, its break begins
from the focus deadline, and an already-finished break returns to the ready
screen. It does not play a string of overdue bells. A tap may be necessary to
resume audio after the phone interrupts it.

Timer state and completed bunnies last for the currently open page session.
Closing or reloading the page resets them. Only the theme preference is retained
on this device when browser storage is available. There is no account, cloud
sync or durable focus history. Offline caching retains app files, not sessions.

## Offline mode and updates

Visit the hosted app online once and wait for **Ready offline**. Then reopen
it without a connection while its cached files remain on the device. Browsers
may clear cached data under storage pressure or when website data is cleared;
reconnect and open the app again to restore offline readiness.

When publishing changes:

1. Update your app files.
2. Change `VERSION` in `sw.js` to a new value, such as `mobile-2`.
3. Upload the complete new version, including `sw.js`.
4. Open the app online, then close all its tabs/app windows and reopen it.

An updated service worker waits until the previous app windows close. This
avoids replacing files mid-session. Cache cleanup applies only to this app's
hosting scope and leaves other apps' caches alone.

Service worker reference:
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

## Validation

JavaScript syntax and local asset references were checked. Automated Node checks
covered automatic breaks, pause/reset, background deadline catch-up, duplicate
reward prevention, offline cache routing at both root and subfolder URLs, and
cache cleanup isolation. Icon dimensions and manifest paths were checked.
Physical Android/iPhone installation and background audio were not tested here.

Suggested phone check after you host:

- Open the HTTPS URL and wait for Ready offline.
- Install it and launch it from its home-screen icon.
- Set focus and break to one minute and verify growth, bell and the break.
- Toggle both themes, change bunny colour before a session, and adjust sound.
- Reopen while offline to check cached loading.
- Switch away during a session and return to check deadline catch-up.
