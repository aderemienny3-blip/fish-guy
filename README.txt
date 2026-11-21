Ogun delivery (areas, delivery days, minimum order)
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-ogun-delivery.zip" -DestinationPath .
2. node scripts/patch-ogun-delivery.mjs     (must end "All done.")
3. npx prisma migrate dev --name ogun-delivery
4. node scripts/setup-ogun-zones.mjs        (adds the Ogun areas, switched OFF)
5. Remove-Item -Recurse -Force .next ; npm run build
6. git add . ; git commit -m "Ogun delivery" ; git push
7. On the live site: Admin > Delivery. For each Ogun area set the fee, minimum order, delivery days, then tick On.
