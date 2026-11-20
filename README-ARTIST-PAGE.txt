ARTIST PAGE (Spotify-style)
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-artist-page.zip" -DestinationPath .
2. node scripts/patch-artist-page.mjs   (must end with "All done.")
3. Remove-Item -Recurse -Force .next
4. npm run build
5. git add . ; git commit -m "Artist page redesign" ; git push
