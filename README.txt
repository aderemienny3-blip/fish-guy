FISH GUY - ORDER ALERTS (email)
Run in PowerShell inside C:\Users\Chairman Enny\fish-guy

1) Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-alerts.zip" -DestinationPath .
2) Remove-Item -Recurse -Force .next
3) npm run build
4) git add .
   git commit -m "Order alerts"
   git push

VERCEL ENVIRONMENT VARIABLES (project: fish-guy), then Redeploy:
  RESEND_API_KEY      your key from resend.com (API Keys)
  ADMIN_ALERT_EMAIL   where YOU get new-order alerts (several allowed, comma separated)
  NOTIFY_FROM         optional. Leave out until your domain is verified in Resend.
                      Then use: Fish Guy <orders@yourdomain.com>
  NEXT_PUBLIC_WHATSAPP optional. Your WhatsApp number with country code, digits only,
                      e.g. 2348012345678. Adds a "Chat with us on WhatsApp" button to order pages.

NOTE: until a domain is verified in Resend, it can only send to the email you signed up with.
Without RESEND_API_KEY nothing breaks. Emails are simply skipped.

WHAT IS SENT
- Customer: receipt when payment is confirmed; updates when packing / out for delivery / delivered.
- You: new paid order alert with items and address; urgent alert if a paid order needs a refund.
- Students: email when approved or rejected.
