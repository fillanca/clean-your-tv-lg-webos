# Personal Quiet/Nuvio fork (unpublished)

This source branch modifies the original Clean Your TV launcher. It is not an upstream release, a standalone Quiet app, or a theme-only package. The original Home Helper, emergency exit, watchdog, installer and recovery implementation remain the owners of system control. Use Classic layout for the inline Continue Watching row; other fixed-layout themes hide that row to avoid overlap. The Nuvio header button opens account/settings in either edition.

## Android delivery

The Android installer embeds a verified TV payload. The official published APK cannot import this source patch or a theme containing account code. Rebuild the payload and a custom Android APK from this exact source. The debug build has applicationId `com.cleanyourtv.android.quiet`, label **CYTV Quiet Test**, and suffix `-quiet-nuvio`. It installs beside the official Android app; its private connection/recovery records are separate. Keep the original app and its receipts. This test APK is locally debug-signed, not signed by the upstream release identity.

Building a release with someone else's signer is neither necessary nor supported. Debug identity separation does not change TV app identities; the modified Home is delivered through the original installation flow. Use the No-root/Developer Mode path appropriate to the existing BX setup. Do not change edition merely to try this integration. Package/version numbers remain the upstream values; the Android payload digest identifies this source's different content.

Follow android/DEVELOPMENT.md, then:

```sh
npm ci
python3 -m pip install -r scripts/build-requirements.txt -r cytv/requirements.txt ziglang==0.14.1
python3 scripts/build-cytv.py --payload-only
cd android
./gradlew :app:assembleDebug
```

Set JDK 17, Android SDK platform/build-tools 35 and Python 3.12 as documented upstream. `android/stage.py` verifies each payload hash before embedding it. `.github/workflows/quiet-nuvio-android.yml` provides a manual build on a personal fork; downloading its artifact does not install or activate anything on a TV.

## Account persistence

`launcher/nuvio-account.js` stores the session in the launcher's own origin under `tvhome.nuvio.session.v1`. It restores after a reload and saves refreshed access/refresh tokens immediately. Concurrent refreshes share one request. A logout increments a generation guard, clears tokens and progress, removes persistent account state and clears thumbnail metadata. Late account replies cannot restore a logged-out session.

This is browser-origin localStorage, not encrypted keychain storage. Anyone with access to the application's private data may be able to recover the account tokens. Do not export this key, add it to generic profile backups, log it or include it in diagnostics. Existing HomeData export allowlists are unchanged and exclude it. The UI reports a failed persistence write/removal instead of silently promising persistence. Browser preview never restores a real account or sends account requests.

LocalStorage may be lost if the LG Developer Mode session expires and removes the application, the app is uninstalled or data is cleared. Persistence cannot prevent backend revocation/expiry; a refused refresh may require association again. The pairing flow uses nuvio.tv/link, anonymous caller signup and the same account RPC names observed in Nuvio 1.3.6. These are internal interfaces, not a supported external API contract. Actual signed-in service access remains unverified on the target TV.

The refresh token and profile belong to the signed-in account. Protected profiles remain unavailable. Home only reads account progress; it never pushes/deletes playback progress or changes the active Nuvio profile. Users must select the same active profile in Nuvio when opening titles.

## Thumbnails

The old standalone prototype disabled optional metadata by default and the sync payload often contained only content IDs. This integration enables artwork by default, explicitly identifies its source in settings, and resolves IMDb IDs (including `imdb:` prefixes and episode suffixes) through Cinemeta. It inserts real image elements with fixed geometry. It tries episode artwork, series/movie background and poster in order, with a fallback placeholder if all fail.

Metadata is cached for 24 hours, bounded to 60 titles. Requests are limited to the four visible cards and occur off the startup path. Titles and progress remain usable without artwork. Arbitrary HTML is never inserted from provider data. Images accept HTTPS only, with no-referrer requests. TMDB-only IDs need a separate resolver and show available text/placeholder in this version. Cinemeta receives title IDs and the requesting IP; image hosts receive image requests. Account history filtering is an approximation: local hidden items/next-episode preferences are not replicated.

## Controls and layout

A fourth header shortcut, Nuvio, uses the original launcher's top-button navigation. In Classic, Up from the first grid row enters Continue Watching when cards are available. Left/Right select a card, OK launches the Nuvio title detail via the launcher's existing launch function. Down/Back returns to the grid, Up returns to the Nuvio shortcut. The panel traps only its own navigation and leaves Home/emergency events untouched; no key-up event is stopped. Header and row elements retain pointer support.

The Quiet OLED option hides the ambient background while retaining the original theme/layout system. The inline row is hidden during scrolling/editing and on incompatible fixed layouts; full theme design is not part of this focused account/artwork correction. The three-day Open-Meteo forecast is ported to the original header, with a two-hour cache, configurable coordinates in the Nuvio panel and non-blocking requests. It is disabled in browser previews. Weather coordinates/preferences are separate from account tokens. Open-Meteo receives configured coordinates and the requesting IP.

## Verification scope

New tests exercise session persistence across fresh adapter instances, token rotation, logout, protected profiles, races, progress mapping, image source resolution/fallback and preview isolation. Existing compatibility/inventory/profile/navigation regressions are run where tools are available. A passing host check or Android packaging check does not prove physical TV Home routing, standby, cold boot, network/TLS or picture performance.

No user credentials are shipped. `nuvio-config.js` contains only public client configuration from the official Nuvio 1.3.6 distribution. Artwork and app names remain owned by their respective rightsholders.

## Host verification for this handoff (4 November 2026)

Eight Nuvio adapter/panel tests passed, as did ES5/CSS compatibility, TV inventory/profile/layout, Helper diagnostics and viewport tests. All 27 Android Python tests passed. The legacy browser suite could not start because its Chrome executable is unavailable here; jsdom checks do not replace physical rendering checks.

The Java-based Gradle download failed with a network-unreachable error in this environment, including an explicit proxy retry. No APK is claimed to have been compiled, signed or installed here. The manual GitHub Actions workflow is provided for building the separate test APK on a personal fork. This is a source handoff, not a published Android release.
