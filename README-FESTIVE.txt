FISH GUY FESTIVE CARTON DEALS + STORE PICKUP

Install (VS Code terminal, project folder), one line at a time:
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-festive.zip" -DestinationPath .
   (This replaces app/api/checkout/route.ts, app/(site)/checkout/page.tsx and components/shop/checkout-client.tsx.)
2. node scripts/patch-festive.mjs          (must end with "All done.")
3. npx prisma migrate dev --name festive
4. node scripts/setup-festive.mjs          (adds "Store pickup")
5. Open lib/business.ts and fill in address: "..." so customers see where to collect.
6. Remove-Item -Recurse -Force .next
7. npm run build
8. git add . ; git commit -m "Festive carton deals and store pickup" ; git push

Then in Admin:
- Products: open each carton product and fill "Carton size (kg)": 10 for chicken, 20 for fish, 10 for fresh water fish like owere. Save.
- Festive deals: choose the gift, how many gifts you have, the bigger reward, tick "Deal is on". Dates are pre-filled 15 Dec to 9 Jan.
Nothing shows to customers until the deal is on and today is inside the dates.
