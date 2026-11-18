FISH GUY - HAND-MADE PLAYLISTS
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy, one at a time.

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-playlists.zip" -DestinationPath .
2) node scripts/patch-playlists.mjs      (must end with "All done.")
3) npx prisma migrate dev --name playlists
4) Remove-Item -Recurse -Force .next
5) npm run build
6) git add .
   git commit -m "Hand-made playlists"
   git push

THEN: Admin > Fish Guy Sounds > Playlists. Create one, add published tracks, arrange the order,
tick "Published". Tick "Play this on the home page while people shop" on ONE playlist
to choose what plays in the shop. Nothing is generated automatically.
