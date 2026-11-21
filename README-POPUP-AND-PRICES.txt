EDITABLE FESTIVE POP-UP + AD PACKAGES ON SALE

Needs the festive deals update (fish-guy-festive.zip) installed first. If you have not installed it yet, do that one first.

Install (VS Code terminal, project folder), one line at a time:
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-popup-and-prices.zip" -DestinationPath .
2. node scripts/patch-festive-edit.mjs     (must end with "All done.")
3. npx prisma migrate dev --name festive-popup
4. node scripts/set-ad-prices.mjs          (puts the ad packages on sale; /advertise opens)
5. Remove-Item -Recurse -Force .next
6. npm run build
7. git add . ; git commit -m "Editable festive pop-up, ad prices" ; git push

Edit the pop-up: Admin > Festive deals > "Pop-up and top strip".
 - picture (upload), headline, message, button text and where it goes, delay, once per visit or once a day, on/off, strip text.
 - Save, then "Preview pop-up" opens the real site with your pop-up even before the deal starts (you must be signed in as admin).
 - The gift/reward lines come from your settings, so they can never disagree with what checkout gives.

Ad prices (launch prices, change any time in Admin > Ads > Packages):
 Sponsored sticker, 7 days  ₦5,000   (up to 3 at once)
 Popup spotlight, 7 days    ₦15,000  (up to 2 at once)
 Featured sound strip, 7 d  ₦25,000  (up to 2 at once)
 Homepage hero image, 7 d   ₦50,000  (exclusive)
Bag inserts are not included: add that package yourself once you know who prints the cards and how they reach your packers.
