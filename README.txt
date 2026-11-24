Pricing and releases: pay what you want, release dates and pre-orders, limited editions
Needs the artist-dashboard and copyright zips installed first.
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-sales.zip" -DestinationPath .
2. node scripts/patch-sales.mjs            (must end "All done.")
3. npx prisma migrate dev --name sales
4. Remove-Item -Recurse -Force .next ; npm run build
5. git add . ; git commit -m "Pay what you want, pre-orders, limited editions" ; git push
Then: Admin > Music > a track > "Sale settings".
