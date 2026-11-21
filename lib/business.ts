/**
 * The facts about your business. Edit this ONE file, then push.
 * Anything left empty ("") is simply not shown on the site, so nothing is ever made up.
 */
export const BUSINESS = {
  name: "Fish Guy",
  legalName: "", // registered name, e.g. "Fish Guy Foods Ltd". Leave empty if unregistered.
  cacNumber: "", // e.g. "RC 1234567"
  address: "14 Koloba Road, off Bada Palace, Ayobo, Ipaja, Lagos",
  phone: "08115993788",
  whatsapp: "2349026405667",
  email: "Hellothefishguy@gmail.com",
  instagram: "fishguyfrozenstore",
  // Your policy: how long after delivery a customer can report a problem (hours).
  reportWindowHours: 24,
  lastUpdated: "17 November 2026",
};

export const hasContact = () => !!(BUSINESS.phone || BUSINESS.whatsapp || BUSINESS.email);
