FISH GUY - PRODUCT PHOTO UPLOAD
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-photos.zip" -DestinationPath .
2) Remove-Item -Recurse -Force .next
3) npm run build
4) git add .
   git commit -m "Product photo upload"
   git push

No database change and no new settings needed. It uses the same Blob store as the music.

Then: Admin > Products > open a product > Upload photo > Save changes.
