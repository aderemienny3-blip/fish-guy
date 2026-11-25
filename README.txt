Fish Guy: lock screen and notification controls. No database change.

Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-lockscreen.zip" -DestinationPath .
node scripts/patch-lockscreen.mjs

Check it says "All done." with no SKIP, then:

Remove-Item -Recurse -Force .next
npm run build
git add .
git commit -m "Lock screen controls"
git push
