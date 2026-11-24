'use client'

import { useState, type FormEvent } from 'react'

export function ReportForm({ trackSlug, trackRef }: { trackSlug: string; trackRef: string }) {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('Sending your report…')
    const f = new FormData(event.currentTarget)
    try {
      const res = await fetch('/api/music/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(f.entries()), trackSlug }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Your report could not be sent.')
      setDone(true)
      setMessage(`Report received. Your reference is ${json.reference}. We have emailed you a copy and will review it shortly.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Your report could not be sent.')
    } finally {
      setPending(false)
    }
  }

  if (done) return <p className="form-message" role="status">{message}</p>

  return (
    <form className="application-form" onSubmit={submit}>
      <div className="form-field"><label htmlFor="r-track">Track or link being reported</label><input id="r-track" name="trackRef" defaultValue={trackRef} required maxLength={300} placeholder="Track title and artist, or the page link" /></div>
      <div className="form-field"><label htmlFor="r-name">Your full name</label><input id="r-name" name="name" autoComplete="name" required maxLength={120} /></div>
      <div className="form-field"><label htmlFor="r-email">Your email</label><input id="r-email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
      <div className="form-field"><label htmlFor="r-own">Which work is yours, and how do you own it or represent the owner?</label><textarea id="r-own" name="ownership" required maxLength={1200} /></div>
      <div className="form-field"><label htmlFor="r-desc">How does this track use your work?</label><textarea id="r-desc" name="description" required maxLength={1500} /></div>
      <div className="form-field"><label htmlFor="r-proof">Link to proof (optional)</label><input id="r-proof" name="proofUrl" maxLength={500} placeholder="Where we can see your original work" /></div>
      <div className="form-field" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label htmlFor="r-web">Leave this empty</label><input id="r-web" name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="checkout-optin"><input type="checkbox" name="agree" required /> I believe in good faith that this use is not authorised by the copyright owner, its agent or the law, and the information above is accurate. I am the owner or authorised to act for the owner.</label>
      <div className="form-field"><label htmlFor="r-sign">Type your full name as your signature</label><input id="r-sign" name="signature" required maxLength={120} /></div>
      <button className="button button-gold" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Submit report'}</button>
      <p className={`form-message ${message && !pending && message.includes('could not') ? 'is-error' : ''}`} aria-live="polite">{message}</p>
    </form>
  )
}
