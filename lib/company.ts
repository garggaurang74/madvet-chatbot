// Company facts, written down once. Every one of these was given or confirmed
// by the client (27–28 Sep 2026); nothing here is inferred. A new claim about
// the company — where it manufactures, how many people, awards — needs his
// word first, the same way a claim about a molecule needs the molecule.
export const COMPANY = {
  name:     'Madvet Animal Healthcare',
  city:     'Ghaziabad, Uttar Pradesh',
  since:    2010,
  // No phone number anywhere on the site (client, 30 Sep: "remove contact
  // number from website" — a WhatsApp chat link shows the number too).
  // Enquiries come by email.
  email:    'support@madvet.in',
  petBrand: 'Careegy',
  leaders: [
    { name: 'Manish Agarwal', role: 'Managing Director' },
    { name: 'Gaurang Garg',   role: 'Chief Executive Officer' },
  ],
  youtube: 'https://www.youtube.com/@madvetanimal9695',
}

// From the 2020 site, kept on the client's say-so (28 Sep).
export const TESTIMONIALS = [
  { quote: 'Madvet India has provided us with amazing products which are of highest quality and potency.', who: 'Dr. Jayesh Sharma', role: 'Veterinarian' },
  { quote: 'Madvet have one of the most competitive pricing and quality model — we always end up with great profits and happy customers.', who: 'Hemant Singh', role: 'Retailer, Babina' },
  { quote: 'हम हमेशा अपने डॉक्टर से मैडवेट के उत्पादों का उपयोग करने के लिए कहते हैं, उनके उत्पाद अद्भुत हैं।', who: 'Seema', role: 'Farmer, UP' },
  { quote: 'Team is really helpful, encourages healthy work and life balance. I am proud to be a part of Madvet India.', who: 'Jitendra Pratap', role: 'VSO, Madvet' },
]

// The team's own photographs (from the 2020 madvet.in media library). Used on
// About, Contact, Careers, Home and as the band above the footer elsewhere —
// the client wants meeting photos across the site (28–29 Sep). Captions say
// what the photo shows, never who is in it.
export const TEAM_PHOTOS = [
  { src: '/company/diwali-meet-1.jpg', caption: 'Diwali Meet & Award Ceremony' },
  { src: '/company/team-group.jpg',    caption: 'The Madvet team' },
  { src: '/company/field-3.jpg',       caption: 'With a retailer, in the field' },
  { src: '/company/diwali-meet-2.jpg', caption: 'Diwali Meet & Award Ceremony' },
  { src: '/company/team-outdoor.jpg',  caption: 'Our sales team' },
  { src: '/company/field-1.jpg',       caption: 'At the counter with our products' },
  { src: '/company/field-2.jpg',       caption: 'Meeting the trade' },
]
