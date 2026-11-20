"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift } from "lucide-react";
import { useFestive } from "@/components/shop/use-festive";
import { fmtShortDate, hasGift, hasReward, plural, rewardText, type PromoRules } from "@/lib/festive-math";

const SEEN = "fish-guy-festive-popup-v1";

function tiers(p: PromoRules) {
  const out: { cartons: string; text: string }[] = [];
  if (hasGift(p)) out.push({ cartons: plural(p.giftMinCartons, "carton"), text: `a free ${p.giftName}` });
  if (hasReward(p)) out.push({ cartons: plural(p.bigMinCartons, "carton"), text: rewardText(p) ?? "" });
  return out.sort((a, b) => parseInt(a.cartons) - parseInt(b.cartons));
}

/** Thin gold strip at the very top of every page while a festive deal is live. */
export function FestiveRibbon() {
  const path = usePathname();
  const data = useFestive();
  const p = data?.promo;
  if (!p || path.startsWith("/festive") || path.startsWith("/checkout")) return null;
  return (
    <Link href="/festive" className="festive-ribbon">
      <Gift aria-hidden="true" />
      <span><strong>{p.title}</strong> <span className="festive-ribbon-detail">· {tiers(p).map((t) => `${t.cartons}: ${t.text}`).join(" · ")}</span> · until {fmtShortDate(p.endDate)}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}

/** One pop-up per visit, on the home page and shop only. */
export function FestivePopup() {
  const path = usePathname();
  const data = useFestive();
  const [open, setOpen] = useState(false);
  const eligible = path === "/" || path.startsWith("/shop");
  const p = data?.promo ?? null;

  useEffect(() => {
    if (!p || !eligible) return;
    try { if (window.sessionStorage.getItem(SEEN)) return; } catch { /* ignore */ }
    const t = window.setTimeout(() => {
      setOpen(true);
      try { window.sessionStorage.setItem(SEEN, "1"); } catch { /* ignore */ }
    }, 2200);
    return () => window.clearTimeout(t);
  }, [p, eligible]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !p || !eligible) return null;
  return (
    <div className="festive-backdrop" onClick={() => setOpen(false)}>
      <div className="festive-popup" role="dialog" aria-modal="true" aria-labelledby="festive-popup-title" onClick={(e) => e.stopPropagation()}>
        <button className="festive-close" type="button" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        <p className="festive-eyebrow">FESTIVE SEASON</p>
        <h3 id="festive-popup-title">{p.title}</h3>
        <ul className="festive-popup-tiers">
          {tiers(p).map((t) => <li key={t.cartons}><strong>Buy {t.cartons}</strong><span>Get {t.text}</span></li>)}
        </ul>
        <p className="festive-popup-note">Chicken, fish and more, by the carton. Ends {fmtShortDate(p.endDate)}.</p>
        <Link href="/festive" className="button button-gold" onClick={() => setOpen(false)}>See the deals</Link>
        <button type="button" className="festive-later" onClick={() => setOpen(false)}>Maybe later</button>
      </div>
    </div>
  );
}
