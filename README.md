# Aman · Costi Andrei

Site personal: `index.html` (HTML + CSS + puțin JS, fără build), găzduit pe Vercel.

- Pagini: Acasă, Despre, Prețuri, Întrebări, Contact, Cont (o singură pagină HTML, comutate prin `#hash`).
- Fotografii: `assets/img/`, fiecare folosită o singură dată.
- Texte RO/EN: textul românesc e în HTML, traducerea în atributul `data-en`.
- Fonturi: Inter găzduit în `assets/fonts/` (licență OFL), fără Google Fonts.
- Zona de client și plățile: `api/` (funcții Vercel), `assets/js/account.js`, `supabase/schema.sql`.
  Cum le pornești: **[SETUP.md](SETUP.md)**.
- Pagini legale: `termeni.html`, `confidentialitate.html`.
- `vercel.json`: redirecționări pentru paginile vechi și headere de securitate.
