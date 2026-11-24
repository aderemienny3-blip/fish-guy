Fish Guy: label accounts, one email per artist, verified tag. Install the meta zip first.

Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-labels.zip" -DestinationPath .
node scripts/patch-labels.mjs
npx prisma migrate dev --name labels
Remove-Item -Recurse -Force .next
npm run build
git add .
git commit -m "Label accounts and verified artists"
git push

If the migration asks to reset the database, answer No. Send me any SKIP line.
Needs ADMIN_ALERT_EMAIL, RESEND_API_KEY and PAYSTACK_SECRET_KEY set on Vercel (already used by earlier kits).
