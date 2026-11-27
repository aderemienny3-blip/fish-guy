import { chatLink } from "@/lib/chat";

/** A link that opens a WhatsApp chat with the message filled in. Renders nothing until a WhatsApp number is set. */
export function WhatsAppLink({ text, label = "Chat on WhatsApp", className = "wa-inline" }: { text: string; label?: string; className?: string }) {
  const href = chatLink(text);
  if (!href) return null;
  return <a className={className} href={href} target="_blank" rel="noreferrer">{label}</a>;
}

/** Round button fixed to the corner of every shop page. */
export function WhatsAppFloat() {
  const href = chatLink("Hello Fish Guy, I have a question.");
  if (!href) return null;
  return (
    <a className="wa-float" href={href} target="_blank" rel="noreferrer" aria-label="Chat with Fish Guy on WhatsApp">
      <svg viewBox="0 0 32 32" aria-hidden="true" width="26" height="26"><path fill="currentColor" d="M16 3C9 3 3.4 8.6 3.4 15.5c0 2.4.7 4.7 1.9 6.6L3 29l7.100-1.800a12.600 12.600 0 0 0 5.900 1.500c7 0 12.600-5.600 12.600-12.500S23 3 16 3Zm0 22.800c-1.900 0-3.700-.5-5.200-1.500l-.4-.2-4.200 1.100 1.100-4.100-.3-.4a10.300 10.300 0 0 1-1.600-5.500C5.400 9.800 10.200 5.200 16 5.200s10.600 4.600 10.600 10.300S21.800 25.800 16 25.800Zm5.700-7.700c-.3-.2-1.900-.9-2.200-1s-.5-.2-.7.200-.8 1-1 1.200-.4.200-.7.100a8.500 8.500 0 0 1-4.200-3.700c-.3-.6.300-.5.900-1.700.1-.2 0-.4 0-.5l-1-2.300c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.100-.9.400s-1.200 1.200-1.200 2.900 1.200 3.300 1.400 3.500 2.400 3.700 5.800 5.100c2.100.9 3 .9 4 .8.600-.1 1.900-.8 2.200-1.500s.3-1.400.2-1.500-.3-.2-.6-.4Z"/></svg>
      <span>WhatsApp</span>
    </a>
  );
}
