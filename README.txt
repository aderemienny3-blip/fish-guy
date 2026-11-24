Fish Guy Sounds polish. Install the protect zip first. No database change.

Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-polish.zip" -DestinationPath .
node scripts/patch-polish.mjs
Remove-Item -Recurse -Force .next
npm run build
git add .
git commit -m "Sounds polish"
git push

Send me any line starting with SKIP.
