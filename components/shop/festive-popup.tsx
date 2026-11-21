"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift } from "lucide-react";
import { useFestive } from "@/components/shop/use-festive";
import { fmtShortDate, hasGift, hasReward, plural, rewardText, type PromoRules } from "@/lib/festive-math";

const SEEN = "fish-guy-festive-popup-v1";
const SEEN_DAY = "fish-guy-festive-popup-day-v1";

function tiers(p: PromoRules) {
  const out: { cartons: string; text: string }[] = [];
  if (hasGift(p)) out.push({ cartons: plural(p.giftMinCartons, "carton"), text: `a free ${p.giftName}` });
  if (hasReward(p)) out.push({ cartons: plural(p.bigMinCartons, "carton"), text: rewardText(p) ?? "" });
  return out.sort((a, b) => parseInt(a.cartons) - parseInt(b.cartons));
}

const previewing = () => typeof window !== "undefined" && window.location.search.includes("festivePreview");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

/** Thin gold strip at the very top of every page while a festive deal is live. */
export function FestiveRibbon() {
  const path = usePathname();
  const data = useFestive();
  const p = data?.promo;
  if (!p || p.ribbonEnabled === false || path.startsWith("/festive") || path.startsWith("/checkout")) return null;
  return (
    <Link href="/festive" className="festive-ribbon">
      <Gift aria-hidden="true" />
      {p.ribbonText ? (
        <span><strong>{p.ribbonText}</strong> · until {fmtShortDate(p.endDate)}</span>
      ) : (
        <span><strong>{p.title}</strong> <span className="festive-ribbon-detail">· {tiers(p).map((t) => `${t.cartons}: ${t.text}`).join(" · ")}</span> · until {fmtShortDate(p.endDate)}</span>
      )}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

/** The pop-up. Everything on it can be edited in Admin > Festive deals. */
export function FestivePopup() {
  const path = usePathname();
  const data = useFestive();
  const [open, setOpen] = useState(false);
  const eligible = path === "/" || path.startsWith("/shop");
  const p = data?.promo ?? null;

  useEffect(() => {
    if (!p || p.popupEnabled === false || !eligible) return;
    const preview = previewing();
    if (!preview) {
      try {
        if (p.popupFrequency === "DAY") { if (window.localStorage.getItem(SEEN_DAY) === today()) return; }
        else if (window.sessionStorage.getItem(SEEN)) return;
      } catch { /* ignore */ }
    }
    const t = window.setTimeout(() => {
      setOpen(true);
      if (preview) return;
      try {
        if (p.popupFrequency === "DAY") window.localStorage.setItem(SEEN_DAY, today());
        else window.sessionStorage.setItem(SEEN, "1");
      } catch { /* ignore */ }
    }, preview ? 400 : Math.max(0, Math.min(30, p.popupDelay ?? 2)) * 1000);
    return () => window.clearTimeout(t);
  }, [p, eligible]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !p || p.popupEnabled === false || !eligible) return null;
  const link = p.popupLink && p.popupLink.startsWith("/") && !p.popupLink.startsWith("//") ? p.popupLink : "/festive";
  return (
    <div className="festive-backdrop" onClick={() => setOpen(false)}>
      <div className="festive-popup" role="dialog" aria-modal="true" aria-labelledby="festive-popup-title" onClick={(e) => e.stopPropagation()}>
        <button className="festive-close" type="button" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        {p.popupImage && (
          <div className="festive-popup-image">
            <Image src={p.popupImage} alt="" fill sizes="420px" unoptimized />
          </div>
        )}
        <p className="festive-eyebrow">FESTIVE SEASON</p>
        <h3 id="festive-popup-title">{p.popupHeadline || p.title}</h3>
        {p.popupShowOffers !== false && (
          <ul className="festive-popup-tiers">
            {tiers(p).map((t) => <li key={t.cartons}><strong>Buy {t.cartons}</strong><span>Get {t.text}</span></li>)}
          </ul>
        )}
        <p className="festive-popup-note">{p.popupMessage || "Chicken, fish and more, by the carton."} Ends {fmtShortDate(p.endDate)}.</p>
        <Link href={link} className="button button-gold" onClick={() => setOpen(false)}>{p.popupButton || "See the deals"}</Link>
        <button type="button" className="festive-later" onClick={() => setOpen(false)}>Maybe later</button>
      </div>
    </div>
  );
}
