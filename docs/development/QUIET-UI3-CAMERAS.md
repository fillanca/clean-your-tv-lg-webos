# Quiet UI3 personal test build: cameras

This unreleased personal build extends Quiet UI2. It is not an upstream release
candidate and carries no physical-TV acceptance claim.

- A virtual `quiet.cameras` application is added once to the normal library, so
  it can be moved/hidden/restored with the existing controls. It opens an in-launcher
  modal, not the browser or an external app.
- Select Mosaic, Argus 2 or E1; Back returns from a single view to the mosaic, and
  closes the mosaic to restore grid focus. Home/emergency keys are never consumed.
  Hiding/exiting releases video resources. A single native HLS video plays at a time.
- The camera tile and camera selection cards use current JPEG snapshots from the
  NAS, refreshed approximately every 60 seconds while visible. The interval can be
  changed to 10–3600 seconds, or disabled with 0. Hidden/offscreen tiles do not start
  captures; hiding cancels pending image callbacks. Successful images remain visible
  on failure, explicitly labelled as stale. Images are never persisted in storage.
- Configure an HTTP(S) gateway origin using Cameras → Server. Gateway credentials,
  URL paths, queries and fragments are rejected. RTSP credentials remain on the NAS.

New state: `tvhome.cameras.v1` stores the gateway origin, per-camera feed selection and refresh interval;
`tvhome.cameras.tile.v1` is a one-time tile migration marker. These are independent
of account tokens, weather and layout settings. UI2's Nuvio/OLED fixes are retained.

Each camera independently selects Sub (default) or Main in the Server settings.
The setting applies to both native video and snapshots. The gateway maps those
choices to separate RTSP URLs configured only on the NAS; it does not promise the
camera supports both URLs. The NAS output remains bounded to 1280 pixels across
for mosaic, and 1920x1080 maximum for individual Main views.

Required NAS routes: `/hls/mosaic-sub-sub/index.m3u8` (all four Sub/Main
combinations), `/hls/argus2-sub/index.m3u8`, `/hls/argus2-main/index.m3u8`,
`/hls/e1-sub/index.m3u8`, `/hls/e1-main/index.m3u8`, and
`/snapshot/{argus2|e1}-{sub|main}.jpg`. The previous
mosaic-only NAS configuration needs the snapshot service update supplied with UI3.
All routes are LAN-only and unauthenticated on the LAN in that sample deployment;
do not expose the sample gateway to the Internet. Capture polling wakes battery
cameras and is a separate operation from opening the live mosaic.

Android debug ID suffix `.quiet.ui3` / label `CYTV Quiet UI3` identifies this installer.
It does not overwrite installer UI2 or import its connection/recovery records.
Use the existing TV target and the installer's supported update/reinstall path.
Do not uninstall the TV launcher first or delete an installer that holds recovery data.

Validation: camera lifecycle/configuration/thumbnail tests and Nuvio regressions,
TV web conversion/compatibility checks. CI additionally builds the TV payload and
Android APK. The tests simulate browser media APIs; actual decoder behavior,
network reachability, multiple camera availability, Home routing, triple-Home,
watchdog, standby/cold boot and rollback still need bounded device acceptance.
The sample mosaic depends on both cameras being online. HLS adds latency.
