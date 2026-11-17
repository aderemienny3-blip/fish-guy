"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

type Inst = { id: string; name: string; type: string };
const GROUPS: [string, string][] = [["UNIVERSITY", "Universities"], ["POLYTECHNIC", "Polytechnics"], ["COLLEGE_OF_EDUCATION", "Colleges of education"], ["OTHER", "Other"]];
export const STUDENT_KEY = "fish-guy-student-v1";

export function StudentApplyForm({ institutions }: { institutions: Inst[] }) {
  const router = useRouter();
  const [inst, setInst] = useState(institutions[0]?.id ?? "other");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const file = f.get("idPhoto") as File;
    if (!file?.size) return setError("Add a clear photo of your student ID.");
    if (file.size > 8 * 1024 * 1024) return setError("That photo is too large. Use one under 8 MB.");
    setBusy(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const blob = await upload(`student-ids/${safe}`, file, { access: "private", handleUploadUrl: "/api/student/upload" });
      const res = await fetch("/api/student/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: f.get("fullName"),
          phone: f.get("phone"),
          email: f.get("email"),
          institutionId: inst === "other" ? null : inst,
          otherInstitution: inst === "other" ? f.get("otherInstitution") || "" : undefined,
          matricNumber: f.get("matricNumber"),
          idPath: blob.pathname,
          consent: f.get("consent") === "on",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json.reference !== "string") throw new Error(json.error ?? "We could not send your application. Please try again.");
      try { window.localStorage.setItem(STUDENT_KEY, json.reference); } catch { /* ignore */ }
      router.push(`/student/${json.reference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not send your application. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="checkout-shell" onSubmit={submit}>
      <fieldset>
        <legend>About you</legend>
        <label>Full name (as on your ID)<input name="fullName" autoComplete="name" required minLength={2} /></label>
        <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="080..." required /></label>
        <label className="span-2">Email<input name="email" type="email" autoComplete="email" required /></label>
      </fieldset>
      <fieldset>
        <legend>Your school</legend>
        <label className="span-2">
          Institution in Lagos
          <select value={inst} onChange={(e) => setInst(e.target.value)}>
            {GROUPS.map(([type, label]) => {
              const items = institutions.filter((i) => i.type === type);
              return items.length ? <optgroup key={type} label={label}>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup> : null;
            })}
            <option value="other">My school is not listed</option>
          </select>
        </label>
        {inst === "other" && <label className="span-2">School name<input name="otherInstitution" required minLength={3} maxLength={150} /></label>}
        <label className="span-2">Matric or student number<input name="matricNumber" required minLength={3} maxLength={40} /></label>
        <label className="span-2">
          Photo of your student ID card
          <input name="idPhoto" type="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <p className="field-note span-2">The photo must show your name, school and a valid session or expiry date. A school portal screenshot or admission letter also works.</p>
      </fieldset>
      <label className="check-row">
        <input type="checkbox" name="consent" required />
        <span>I agree that Fish Guy may use my details and ID photo only to check that I am a student. The ID photo is deleted once the application is reviewed.</span>
      </label>
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      <button className="button button-gold" type="submit" disabled={busy}>{busy ? "Sending…" : "Send my application"}</button>
    </form>
  );
}
