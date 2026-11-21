Artist dashboard (plays, sales, locations, recent buyers)
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-artist-dashboard.zip" -DestinationPath .
2. node scripts/patch-artist-dashboard.mjs   (must end "All done.")
3. npx prisma migrate dev --name artist-dashboard
4. Remove-Item -Recurse -Force .next ; npm run build
5. git add . ; git commit -m "Artist dashboard" ; git push
6. Admin > Music > Artists: make sure each artist has their login email filled in.
Needs RESEND_API_KEY (already used for order emails) and AUTH_SECRET.
