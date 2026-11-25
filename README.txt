Fish Guy: music player fix for phones, plus lock screen controls. No database change.

Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-mobile-player.zip" -DestinationPath .
node scripts/patch-mobile-player.mjs

Check for "All done." and no SKIP, then:

Remove-Item -Recurse -Force .next
npm run build
git add .
git commit -m "Mobile player fix and lock screen controls"
git push
