# PPK in the browser

`index.htm` uses the js-dos v8 CDN player and its WebAssembly DOSBox-X backend.
`ppk.jsdos` contains the seven original game files and `.jsdos/dosbox.conf`.
Compatibility settings: `machine=vgaonly`, `core=normal`, `cycles=1000`,
with Canvas rendering. The original SVGA/DOSBox combination produced graphics
corruption; the VGA/DOSBox-X combination was verified in the browser.

The configuration mounts the bundle as C: and runs `PPK.EXE`.
No cross-origin isolation headers or multithreaded WASM are required.

Rebuild the bundle after changing the DOSBox configuration:

```sh
python3 raccoon/build-bundle.py
```

Preview from the repository root:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080/raccoon/index.htm, click Play, then press Space
at the title screen. The page must be served over HTTP(S), not `file://`.
Internet access is required for the js-dos CDN assets. GitHub Pages can
serve the page and bundle without a build step.

Verified locally: title screen, Space to enter stage 1, and right-arrow
movement. Sound and all additional stages have not been fully tested.

API reference: https://js-dos.com/dos-api.html
Bundle format: https://js-dos.com/jsdos-bundle.html
