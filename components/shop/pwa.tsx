"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS_KEY = "fish-guy-install-dismissed-v1";

export function PwaBoot() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try { dismissed = window.localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* ignore */ }
    if (standalone || dismissed) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) { setIos(true); setShow(true); }

    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); setShow(true); };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  function dismiss() {
    setShow(false);
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  }
  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => undefined);
    setEvt(null);
    setShow(false);
  }

  if (!show || (!evt && !ios)) return null;
  return (
    <div className="install-bar" role="region" aria-label="Install the Fish Guy app">
      <div className="install-copy">
        <strong>Add Fish Guy to your home screen</strong>
        <span>{ios && !evt ? "Tap the Share button, then “Add to Home Screen”." : "Order faster, right from your phone."}</span>
      </div>
      {evt && <button type="button" className="button button-gold" onClick={install}>Install</button>}
      <button type="button" className="install-close" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}
