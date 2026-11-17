FISH GUY - TERMS, PRIVACY, DELIVERY & REFUNDS, CONTACT
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-legal.zip" -DestinationPath .
2) Open lib\business.ts in VS Code and fill in your real details
   (phone, WhatsApp, email, address, CAC number). Anything left "" is hidden on the site.
   Check reportWindowHours (how many hours customers have to report a problem).
3) Remove-Item -Recurse -Force .next
4) npm run build
5) git add .
   git commit -m "Legal and contact pages"
   git push

Pages: /terms  /privacy  /delivery-refunds  /contact  (linked in the footer)
These are sensible starting texts, not legal advice. Have a lawyer read them before launch.
