FISH GUY - PLAY BUTTON EVERYWHERE + ALWAYS-VISIBLE PLAYER
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy, one at a time.

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-play.zip" -DestinationPath .
2) node scripts/patch-play.mjs        (must end with "All done.")
3) Remove-Item -Recurse -Force .next
4) npm run build
5) git add .
   git commit -m "Play button and always-visible player"
   git push

No database change. No new settings.
