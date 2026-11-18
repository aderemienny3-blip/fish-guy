FISH GUY - HOME-SCREEN APP INSTALL
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-app.zip" -DestinationPath .
2) Remove-Item -Recurse -Force .next
3) npm run build
4) git add .
   git commit -m "Home-screen app install"
   git push

No Vercel settings needed.
The icons are a simple gold "FG" mark. To use your real logo later, replace the 4 files in public\icons
(icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png) keeping the same names and sizes.
