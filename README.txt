FISH GUY - WHATSAPP BUTTONS IN ADMIN
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-whatsapp.zip" -DestinationPath .
2) Remove-Item -Recurse -Force .next
3) npm run build
4) git add .
   git commit -m "WhatsApp buttons"
   git push

No Vercel settings needed.
