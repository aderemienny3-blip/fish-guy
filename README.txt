FISH GUY ADS - ARTIST AD BOOKING
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy, one at a time.

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-ads.zip" -DestinationPath .
2) node scripts/patch-ads.mjs
      (adds the tables and connects the ads to your existing pages. It must end with "All done.")
3) npx prisma migrate dev --name ads
4) Remove-Item -Recurse -Force .next
5) npm run build
6) git add .
   git commit -m "Fish Guy Ads"
   git push

THEN, in Admin > Ads > Packages and prices: add your packages (name, where it appears,
price from N5,000 to N2,000,000, days, optional limit of ads at the same time).
Until you add one, /advertise shows "Ad packages are being set up".

Uses the same Monnify webhook as everything else. No new settings.
Emails use your Resend settings if you added them (otherwise skipped).
