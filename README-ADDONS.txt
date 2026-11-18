FISH GUY ADD-ONS (ponmo, plantain and other extras)

What you get
- Tick "Add-on" on any product (Admin > Products). It leaves the main grid and appears in a separate "Add-ons" section of the shop.
- Every normal product page shows "Goes well with this" with one-tap add buttons.
- The cart drawer shows "Add to your order" so customers can add ponmo/plantain without leaving the cart.
- Add-ons are normal products: same price, stock, photo and checkout. Nothing is invented; with no add-ons ticked, none of this shows.

Install (VS Code terminal, in the project folder)
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-addons.zip" -DestinationPath .
2. node scripts/patch-addons.mjs          (must end with "All done.")
3. npx prisma migrate dev --name addons
4. node scripts/mark-addons.mjs           (optional: ticks products already named ponmo/plantain/dodo)
5. Remove-Item -Recurse -Force .next
6. npm run build
7. git add .
   git commit -m "Add-ons section"
   git push

Then: Admin > Products > Add product (or edit one), tick "Add-on", save.
Photos need BLOB_READ_WRITE_TOKEN set on Vercel, same as other products.
