MOVE THE WHOLE SITE TO PAYSTACK (food, music, artist ads) AND REMOVE MONNIFY

Works whether or not you installed the earlier fish-guy-paystack.zip. Do not install that one if you have not; use this one.

Install (VS Code terminal, project folder), one line at a time:
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-paystack-only.zip" -DestinationPath .
2. node scripts/remove-monnify.mjs      (must end with "No mention of Monnify is left in the code." and "All done.")
3. npx prisma migrate dev --name paystack-only
4. Remove-Item -Recurse -Force .next
5. npm run build
6. git add . ; git commit -m "Paystack only" ; git push

Paystack setup (once):
a. paystack.com > sign up > complete business verification (needed for live payments).
b. Settings > API Keys & Webhooks: copy the TEST secret key (sk_test_...).
c. Same page, Test Webhook URL (and later the Live one):
   https://fish-guy-kappa.vercel.app/api/webhooks/paystack
d. Vercel > fish-guy > Settings > Environment Variables: add PAYSTACK_SECRET_KEY = the key. Redeploy.
e. Delete the old MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE and MONNIFY_BASE_URL variables.
f. Test one food order, one music purchase and one ad payment with a Paystack test card. Then switch to sk_live_ keys.

That single webhook URL handles food orders (FG-), music (FGS-) and artist ads (FGA-).
