PAYSTACK (second way to pay, for food orders)

Install (VS Code terminal, project folder), one line at a time:
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-paystack.zip" -DestinationPath .
2. node scripts/patch-paystack.mjs      (must end with "All done.")
3. Remove-Item -Recurse -Force .next
4. npm run build
5. git add . ; git commit -m "Add Paystack" ; git push
No database change.

Paystack setup:
a. Sign up at paystack.com and complete business verification (needed to go live).
b. Dashboard > Settings > API Keys & Webhooks. Copy the TEST secret key (sk_test_...).
c. Same page: set the Test webhook URL (and later the Live one) to
   https://fish-guy-kappa.vercel.app/api/webhooks/paystack
d. Vercel > fish-guy project > Settings > Environment Variables: add PAYSTACK_SECRET_KEY = the key. Redeploy.
   Optional: PAYMENT_PRIMARY = paystack  (lists Paystack first).
e. Test with a Paystack test card, then swap to the live secret key (sk_live_...) when verified.

When only one gateway has keys, checkout uses it. When both do, customers see "Pay with".
Music purchases and artist ads still use Monnify.
