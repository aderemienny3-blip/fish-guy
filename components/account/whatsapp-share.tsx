/** Opens WhatsApp with a message ready to send. */
export function WhatsAppShare({ text }: { text: string }) {
  return <a className="button button-gold" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>;
}
