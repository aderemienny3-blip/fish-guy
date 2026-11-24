Fan engagement data, superfan exclusives, fan announcements
Needs the artist-dashboard, copyright and sales zips installed first.
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-fans.zip" -DestinationPath .
2. node scripts/patch-fans.mjs              (must end "All done.")
3. npx prisma migrate dev --name fans
4. Remove-Item -Recurse -Force .next ; npm run build
5. git add . ; git commit -m "Fan data, superfans, announcements" ; git push
Needs RESEND_API_KEY, NOTIFY_FROM (a verified sender is best), NEXT_PUBLIC_SITE_URL and AUTH_SECRET in Vercel.
