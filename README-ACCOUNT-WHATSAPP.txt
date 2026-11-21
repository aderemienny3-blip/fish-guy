WHATSAPP ORDER ALERTS + CUSTOMER ACCOUNT WITH REORDER

Install (VS Code terminal, project folder), one line at a time:
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-account-whatsapp.zip" -DestinationPath .
2. node scripts/patch-account-whatsapp.mjs     (must end with "All done.")
3. Remove-Item -Recurse -Force .next
4. npm run build
5. git add . ; git commit -m "WhatsApp alerts, My account, reorder" ; git push
No database change.

WHAT CUSTOMERS GET
/account (link "Account" in the menu): sign in with their phone number + a 6-digit code, see past orders (including earlier guest orders with the same phone or email), press Reorder to refill the cart at today's prices and stock. Google sign-in appears only if you add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.

WHAT YOU GET
Admin > Order alerts: status + "Send a test alert". Every paid order sends a WhatsApp line to your phone: order, customer, pickup/delivery, day and time, total, gift, note. A refund-needed case sends one too. Email alerts continue.

WHATSAPP SETUP (Meta WhatsApp Cloud API). Allow a few days: Meta business verification is the slow part.
1. developers.facebook.com > My Apps > Create App > type Business > add the "WhatsApp" product.
2. WhatsApp > API Setup: note the Phone number ID. You can test with Meta's test number first (add your own number as a recipient).
3. For real use: add YOUR business number (it must not be active on the normal WhatsApp app) and verify your business in Meta Business Settings.
4. Business Settings > Users > System users > add a user > generate token with permissions whatsapp_business_messaging and whatsapp_business_management. This is a permanent token. Keep it private.
5. WhatsApp Manager > Message templates > Create two templates (language English):
   a) Name: fish_guy_alert   Category: Utility
      Body: Fish Guy alert: {{1}}. Open your admin to see it.
      (sample for {{1}}: NEW ORDER FG-ABC123 | Ada 2348012345678 | Delivery Ikeja | N45,000)
   b) Name: fish_guy_login_code   Category: Authentication
      Choose "Copy code" button, code expiry 5 minutes. Meta writes the body for you ("{{1}} is your verification code.").
   Wait until both show Approved.
6. Vercel > fish-guy > Settings > Environment Variables, add:
   WHATSAPP_TOKEN       = the system user token
   WHATSAPP_PHONE_ID    = the Phone number ID
   WHATSAPP_ALERT_TO    = your number(s) with country code, no plus, comma separated, e.g. 2348012345678
   Redeploy.
7. Admin > Order alerts > Send a test alert.
Meta charges a small fee per message after any free allowance: check Meta's current WhatsApp pricing for Nigeria.
Optional: WHATSAPP_ALERT_TEMPLATE, WHATSAPP_OTP_TEMPLATE, WHATSAPP_TEMPLATE_LANG (default en), WHATSAPP_OTP_BUTTON=false if your login template has no button.
Until WhatsApp is set up, phone login only works if the old SMS (Termii) is configured; otherwise customers see "Login codes are not available right now".
