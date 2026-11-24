'use client'

import { useRef, useState, type FormEvent } from 'react'
import { formatNaira } from '@/lib/money'
import { useMusicPlayer } from '@/components/music/music-player'
import type { MusicTrack } from '@/lib/music/data'

export function PlayTrackButton({ track, queue, label = 'Play preview' }: { track: MusicTrack; queue: MusicTrack[]; label?: string }) {
  const { currentTrack, isPlaying, playTrack, togglePlayback } = useMusicPlayer()
  const active = currentTrack?.id === track.id
  return (
    <button className="button button-outline" type="button" disabled={!track.canPlay} onClick={() => active ? togglePlayback() : playTrack(track, queue)}>
      {active && isPlaying ? 'Pause track' : label}
    </button>
  )
}

export function CheckoutForm({ trackId, title, priceKobo, payWhatYouWant = false, suggestedKobo = null, soldOut = false, preOrderLabel = '' }: { trackId: string; title: string; priceKobo: number; payWhatYouWant?: boolean; suggestedKobo?: number | null; soldOut?: boolean; preOrderLabel?: string }) {
  const [message, setMessage] = useState('')
  const [isPending, setIsPending] = useState(false)
  const idempotencyKey = useRef<string | null>(null)
  const [amount, setAmount] = useState(String((suggestedKobo ?? priceKobo) / 100))
  const amountKobo = Math.round((Number(amount) || 0) * 100)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setIsPending(true)
    setMessage('Opening secure Paystack checkout…')
    idempotencyKey.current ??= crypto.randomUUID()
    try {
      const response = await fetch('/api/music/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, buyerName: formData.get('buyerName'), buyerEmail: formData.get('buyerEmail'), idempotencyKey: idempotencyKey.current, amountKobo: payWhatYouWant ? amountKobo : undefined, shareWithArtist: formData.get('shareWithArtist') === 'on' }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (result.retryWithNewKey) idempotencyKey.current = crypto.randomUUID()
        throw new Error(result.error || 'Checkout could not be started.')
      }
      if (typeof result.checkoutUrl !== 'string') throw new Error('Checkout could not be started.')
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout could not be started. Please try again.')
      setIsPending(false)
    }
  }

  return (
    <section className="checkout-panel" aria-labelledby="buy-track-title">
      <h2 id="buy-track-title">Buy {title}</h2>
      <p>Pay securely in naira through Paystack. Your purchased track will appear in My Library after payment is verified.</p>
      <form className="checkout-form" onSubmit={submit}>
        {payWhatYouWant && (
          <div className="form-field"><label htmlFor="pay-amount">Pay what you want (minimum {formatNaira(priceKobo)})</label><input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
        )}
        <div className="form-field"><label htmlFor="buyer-name">Your name</label><input id="buyer-name" name="buyerName" autoComplete="name" maxLength={100} required /></div>
        <div className="form-field"><label htmlFor="buyer-email">Email for your receipt</label><input id="buyer-email" name="buyerEmail" type="email" autoComplete="email" maxLength={254} required /></div>
        <label className="checkout-optin"><input type="checkbox" name="shareWithArtist" /> Let the artist see my name and email so they can thank me and tell me about new music (optional)</label>
        <button className="button button-gold" type="submit" disabled={isPending || soldOut || (payWhatYouWant && amountKobo < priceKobo)}>{soldOut ? 'Sold out' : isPending ? 'Connecting…' : `${preOrderLabel ? 'Pre-order' : 'Pay'} ${formatNaira(payWhatYouWant ? amountKobo : priceKobo)} securely`}</button>
        <p className={`form-message ${message && !isPending ? 'is-error' : ''}`} aria-live="polite">{message}</p>
        <p className="checkout-disclaimer">The full audio download is delivered privately after Paystack confirms payment. Artists see your first name and approximate location (city or state) with each sale.</p>
      </form>
    </section>
  )
}
