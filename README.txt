Fish Guy batch 4: split sheets, earnings ledger, payouts, plus the labels line in the Artist terms.
Install the labels zip first.

Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-payouts.zip" -DestinationPath .
node scripts/patch-payouts.mjs
npx prisma migrate dev --name payouts
Remove-Item -Recurse -Force .next
npm run build
git add .
git commit -m "Split sheets, earnings and payouts"
git push

If the migration asks to reset the database, answer No. Send me any SKIP line.
Then in admin open "Payouts and splits" and set the artist share. Nothing is recorded until you do.
