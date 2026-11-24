Fish Guy: ISRC and file labels, roster overview, faster app. Install the polish zip first.

Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-meta.zip" -DestinationPath .
node scripts/patch-meta.mjs
npm install
npx prisma migrate dev --name isrc
Remove-Item -Recurse -Force .next
npm run build
git add .
git commit -m "ISRC, file labels, roster overview"
git push

If the migration asks to reset the database, answer No. Send me any SKIP line.
