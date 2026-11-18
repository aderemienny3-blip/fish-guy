FISH GUY - EDITABLE HOMEPAGE IMAGE + HERO ADS
Needs the Fish Guy Ads kit (fish-guy-ads.zip) and the photo upload kit installed first.
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy, one at a time.

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-hero.zip" -DestinationPath .
2) node scripts/patch-hero.mjs        (must end with "All done.")
3) npx prisma migrate dev --name hero
4) Remove-Item -Recurse -Force .next
5) npm run build
6) git add .
   git commit -m "Editable homepage image and hero ads"
   git push

THEN
- Admin > Homepage: upload your picture (or an artist's), set the caption, Save.
- Admin > Ads > Packages and prices: add a package with "Homepage hero image" as where it appears.
