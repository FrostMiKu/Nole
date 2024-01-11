# Nólë

A typst based editor & notebook application

Build with: `Tauri + React + Typescript`

**Attention! run it before build!**
```sh
cp -r node_modules/@excalidraw/excalidraw/dist/excalidraw-assets public/
cp -r node_modules/@excalidraw/excalidraw/dist/excalidraw-assets-dev public/
```

For windows:
1. create .env file
2. set VITE_OS = windows (Just for the path separator, currently)
```js
# define the OS [macOS, linux, windows]
VITE_OS = "windows"
```

All APIs are exposed in the `src/lib/nole.ts`
