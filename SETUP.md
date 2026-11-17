# Contul de client

Clienții se loghează cu Google și văd statusul comenzilor. Site-ul **nu încasează plăți**:
plata se face prin transfer bancar, după ce stabiliți detaliile pe Instagram.

## Cum funcționează

1. Clientul apasă „Aleg Mini / Starter / Business” la Pachete. Se deschide Instagram ca să-ți scrie.
2. Dacă e logat pe site, cererea apare automat în contul lui, cu statusul
   **„Cerere trimisă · aștept plata”**.
3. Îi trimiți pe Instagram contul pentru transfer.
4. Când primești banii, schimbi statusul comenzii (vezi mai jos). Clientul îl vede în cont.

## Cum gestionezi comenzile

Supabase → proiectul **costi1andrei website** → **Table Editor → orders**
(<https://supabase.com/dashboard/project/qjfvphhsqvutuxlxrvec/editor>).

| Coloană | Ce pui |
|---|---|
| `status` | `requested` → `paid` → `in_progress` → `review` → `delivered`. Mai există `cancelled` și `refunded`. |
| `note` | Un mesaj pe care clientul îl vede în cont (de exemplu „Am primit plata, livrez joi”). |
| `delivery_url` | Linkul către fișierele finale (Google Drive, WeTransfer etc.), doar `https://`. |

`paid_at` se completează singur când pui statusul `paid` sau mai departe.

Dacă un client îți scrie direct pe Instagram, fără să fi apăsat butonul din site, poți adăuga
tu comanda: **Insert row**, cu `user_id` luat din **Authentication → Users** (după emailul lui).

## Unde e configurat

- **Supabase** (proiect `qjfvphhsqvutuxlxrvec`, regiunea UE): baza de date și logarea.
  Schema e în `supabase/schema.sql`. Logarea cu email/telefon e oprită; merge doar Google.
- **Google Cloud** (proiectul `Aman`, Google Auth Platform): clientul OAuth pentru „Continuă cu Google”.
  Redirect URI: `https://qjfvphhsqvutuxlxrvec.supabase.co/auth/v1/callback`.
- **Vercel** (proiectul `aman-site`) → Settings → Environment Variables:
  `SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Fără aceste variabile, pagina Cont spune „în curând”, iar butoanele duc doar pe Instagram.

## Siguranță și GDPR

- Fiecare client își vede doar comenzile lui (regulă în baza de date, RLS).
  Din browser nimeni nu poate modifica statusuri sau prețuri.
- Datele stau în UE. Fonturile sunt găzduite pe site, fără Google Fonts.
- Fără cookie-uri de reclamă sau statistici, deci fără banner de cookie-uri.
- Clientul își poate descărca datele și își poate șterge contul din pagina Cont.
- Politică de confidențialitate, termeni și link ANPC SAL în subsolul fiecărei pagini.
- Headere de securitate (CSP, HSTS, anti-iframe) în `vercel.json`.
