# PC Phone
Phone app = screen. Apps, files, data live on your PC in one folder.

## PC
Actions -> "Build APK + PC package" -> download `PCPhone-for-Windows`, unzip anywhere.
Double-click `Start PC Phone.bat` (no installs). It prints your address.
Everything is saved in `data/`. Copy that folder = full backup.
Away from home: `npx cloudflared tunnel --url http://localhost:3000`.

## Phone
Same Actions run -> `PCPhone-apk` -> install. Enter the PC address once.
