Fish Guy: download protection and player upgrades (batch 3)

Install the sales and fans zips first.

From the project folder, in the VS Code terminal:

Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-protection.zip" -DestinationPath .
node scripts/patch-protect.mjs
npx prisma migrate dev --name protection
Remove-Item -Recurse -Force .next
npm run build
git add .
git commit -m "Download protection and player upgrades"
git push

If the migration asks to reset the database, answer No.
Send me any line that starts with SKIP.

What you get
- Each purchase has 5 downloads per file type (MP3, WAV). A link is counted once, when first opened. A resumed download still works for 15 minutes.
- Max 10 download links per purchase per hour.
- Buyers see "downloads left" in My Library.
- Admin, Music downloads: buyers at the limit, or downloading from 3+ countries, listed first, with a "Give 5 more" button.
- Other websites cannot embed or hotlink your audio or downloads.
- Player: Space (play/pause), Left/Right (skip 10s), N (next), M (mute), repeat-this-track button, "Buffering" note, remembered volume, and "30-second preview. Get the full track" link when a listener has not bought it.

Honest note: no website can fully stop someone recording what they hear. These limits stop casual sharing and make abuse visible. Watermarking each buyer's file is a bigger later project.
