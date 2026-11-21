// Artist dashboard: location capture, buyer opt-in, wiring. Safe to re-run.
// Run from the project root:  node scripts/patch-artist-dashboard.mjs
import fs from "node:fs";

let problems = 0;
function patch(file, steps) {
  if (!fs.existsSync(file)) { console.log(`SKIP ${file} (not found)`); problems++; return; }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let src = raw.replace(/\r\n/g, "\n");
  let changed = false;
  for (const { label, done, from, to } of steps) {
    if (src.includes(done)) { console.log(`ok   ${file}: ${label} (already done)`); continue; }
    if (!src.includes(from)) { console.log(`SKIP ${file}: ${label} (anchor not found)`); problems++; continue; }
    src = src.replace(from, to);
    changed = true;
    console.log(`done ${file}: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
}

patch("prisma/schema.prisma", [
  {
    label: "play location",
    done: "model MusicPlay {\n  id           String   @id @default(cuid())\n  trackId      String\n  listenerHash String\n  playDay      String\n  playedAt     DateTime @default(now())\n  country",
    from: "  playDay      String\n  playedAt     DateTime @default(now())\n",
    to: "  playDay      String\n  playedAt     DateTime @default(now())\n  country      String?\n  region       String?\n  city         String?\n",
  },
  {
    label: "order location and opt-in",
    done: "shareWithArtist",
    from: "  paidAt           DateTime?\n  items            MusicOrderItem[]\n",
    to: "  paidAt           DateTime?\n  country          String?\n  region           String?\n  city             String?\n  shareWithArtist  Boolean          @default(false)\n  items            MusicOrderItem[]\n",
  },
  {
    label: "ArtistCode model",
    done: "model ArtistCode",
    from: "// ---- FISH GUY STUDENT DISCOUNT ----",
    to: "// ---- ARTIST DASHBOARD LOGIN ----\n\nmodel ArtistCode {\n  id        String    @id @default(cuid())\n  email     String\n  codeHash  String\n  expiresAt DateTime\n  attempts  Int       @default(0)\n  usedAt    DateTime?\n  createdAt DateTime  @default(now())\n\n  @@index([email, createdAt])\n}\n\n// ---- FISH GUY STUDENT DISCOUNT ----",
  },
]);

patch("app/api/music/plays/[trackId]/route.ts", [
  { label: "import geo", done: "geoFrom", from: 'import { lagosDateOf } from "@/lib/admin/format";', to: 'import { lagosDateOf } from "@/lib/admin/format";\nimport { geoFrom } from "@/lib/geo";' },
  { label: "save play location", done: "...geoFrom(request.headers)", from: "playDay: lagosDateOf(new Date()) },", to: "playDay: lagosDateOf(new Date()), ...geoFrom(request.headers) }," },
]);

patch("app/api/music/checkout/route.ts", [
  { label: "import geo", done: "geoFrom", from: 'import { initPaystack, isPaystackCheckoutUrl } from "@/lib/paystack";', to: 'import { initPaystack, isPaystackCheckoutUrl } from "@/lib/paystack";\nimport { geoFrom } from "@/lib/geo";' },
  {
    label: "save buyer location and opt-in",
    done: "shareWithArtist: body?.shareWithArtist === true",
    from: "        amountKobo: track.priceKobo,\n        idempotencyKey,\n",
    to: "        amountKobo: track.priceKobo,\n        idempotencyKey,\n        ...geoFrom(request.headers),\n        shareWithArtist: body?.shareWithArtist === true,\n",
  },
]);

patch("components/music/checkout-form.tsx", [
  {
    label: "send opt-in",
    done: "shareWithArtist: formData.get",
    from: "idempotencyKey: idempotencyKey.current }),",
    to: "idempotencyKey: idempotencyKey.current, shareWithArtist: formData.get('shareWithArtist') === 'on' }),",
  },
  {
    label: "opt-in checkbox",
    done: 'name="shareWithArtist"',
    from: '        <button className="button button-gold" type="submit" disabled={isPending}>',
    to: '        <label className="checkout-optin"><input type="checkbox" name="shareWithArtist" /> Let the artist see my name and email so they can thank me and tell me about new music (optional)</label>\n        <button className="button button-gold" type="submit" disabled={isPending}>',
  },
  {
    label: "location notice",
    done: "approximate location",
    from: "The full audio download is delivered privately after Paystack confirms payment.",
    to: "The full audio download is delivered privately after Paystack confirms payment. Artists see your first name and approximate location (city or state) with each sale.",
  },
]);

patch("app/(site)/layout.tsx", [{ label: "dashboard css", done: "artist-dashboard.css", from: 'import "./playlists.css";', to: 'import "./playlists.css";\nimport "./artist-dashboard.css";' }]);

patch("components/music/site-shell.tsx", [{
  label: "footer link", done: 'href="/artist/login"',
  from: '<Link href="/sounds/apply">Artist application</Link>',
  to: '<Link href="/sounds/apply">Artist application</Link>\n        <Link href="/artist/login">Artist sign in</Link>',
}]);

patch("components/admin/ArtistFields.tsx", [{
  label: "login email label", done: "Artist login email",
  from: "Contact email (private)",
  to: "Artist login email (they sign in to their dashboard with a code sent here)",
}]);

patch("app/(site)/privacy/page.tsx", [{
  label: "privacy wording", done: "approximate location",
  from: "Play counts are recorded for artists without being linked to your name.",
  to: "Play counts are recorded for artists without being linked to your name, together with your approximate location (state or city, worked out from your internet connection). Artists see each buyer's first name and approximate location. Your email is shared with the artist only if you tick the box at checkout.",
}]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
