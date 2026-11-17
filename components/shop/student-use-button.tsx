"use client";

import { useState } from "react";
import Link from "next/link";
import { STUDENT_KEY } from "@/components/shop/student-apply-form";

export function StudentUseButton({ reference }: { reference: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="student-actions">
      <button
        className="button button-gold"
        type="button"
        onClick={() => { try { window.localStorage.setItem(STUDENT_KEY, reference); } catch { /* ignore */ } setSaved(true); }}
      >
        {saved ? "Saved on this device" : "Use my discount on this device"}
      </button>
      <Link href="/shop" className="button button-outline">Start shopping</Link>
    </div>
  );
}
