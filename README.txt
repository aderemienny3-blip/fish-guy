FISH GUY SOUNDS - merge kit
===========================
Adds the music app to your fish-guy project: same database, same Monnify, one webhook, admin pages.

STEPS (PowerShell, from your Downloads folder where the zip landed)
1. cd "C:\Users\Chairman Enny\fish-guy"
2. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-music.zip" -DestinationPath .
   (it replaces app\api\webhooks\monnify\route.ts and app\admin\(panel)\layout.tsx on purpose)
3. Get-Content prisma\music-models.prisma | Add-Content prisma\schema.prisma
   Remove-Item prisma\music-models.prisma
4. npm i @vercel/blob lucide-react
5. npx prisma migrate dev --name music
6. npm run build
7. git add . ; git commit -m "Add Fish Guy Sounds" ; git push

VERCEL
- Storage > Create > Blob. Choose a PRIVATE store. Connect it to the fish-guy project (adds BLOB_READ_WRITE_TOKEN).
- Env vars already needed: MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE, MONNIFY_BASE_URL.
- Monnify webhook URL (one only): https://YOUR-DOMAIN/api/webhooks/monnify

WHAT YOU GET
Public:  /sounds  /sounds/[track]  /sounds/apply  /sounds/return  /library  /artists/[artist]
Admin:   /admin/music (stats, tracks, publish, price)  /admin/music/applications
         /admin/music/artists/new  /admin/music/tracks/new (uploads straight to Blob)

PUBLISHING A TRACK
Add artist (or approve an application) > Upload track (full MP3 + 30-second preview, optional WAV/cover) > Publish.
Paid tracks play only the preview until bought. Free-to-stream tracks play in full.
