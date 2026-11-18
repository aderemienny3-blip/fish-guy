ARTIST PHOTO UPLOAD
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-artist-photos.zip" -DestinationPath .
2. node scripts/patch-artist-photos.mjs   (must end with "All done.")
3. Remove-Item -Recurse -Force .next
4. npm run build
5. git add . ; git commit -m "Artist photo upload" ; git push
No database change. Needs BLOB_READ_WRITE_TOKEN on Vercel (same as product photos).
