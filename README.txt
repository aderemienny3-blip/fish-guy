Copyright protection
1. Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-copyright.zip" -DestinationPath .
2. node scripts/patch-copyright.mjs        (must end "All done.")
3. npx prisma migrate dev --name copyright
4. Remove-Item -Recurse -Force .next ; npm run build
5. git add . ; git commit -m "Copyright protection" ; git push
Then: have a Nigerian entertainment lawyer review /artist-terms.
Report emails use ADMIN_ALERT_EMAIL (comma-separated) and RESEND_API_KEY.
