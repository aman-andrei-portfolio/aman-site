# Pornirea contului de client și a plăților

Codul e gata. Ca să funcționeze pe site, ai nevoie de 3 conturi gratuite pe numele tău
(Supabase, Google Cloud, Stripe) și de 6 chei puse în Vercel. Durează cam 30–40 de minute.

Până nu pui cheile, site-ul funcționează exact ca acum: pagina „Cont” spune că zona de
client vine în curând, iar butoanele de la pachete duc pe Instagram.

> Cheile secrete (`service_role`, `sk_...`, `whsec_...`) nu le trimiți nimănui și nu le pui
> în cod sau în chat. Le lipești doar în Vercel, la pasul 4.

---

## 1. Supabase: baza de date și conturile

1. Intră pe <https://supabase.com> → **Start your project** → te loghezi cu GitHub.
2. **New project**: nume `aman`, o parolă puternică pentru baza de date (păstreaz-o),
   **Region: Central EU (Frankfurt)**. Datele rămân în UE.
3. Când e gata proiectul: **SQL Editor** → **New query** → lipește tot conținutul fișierului
   `supabase/schema.sql` din acest repo → **Run**. Trebuie să scrie „Success”.
4. **Project Settings → API** (sau **Data API**) și notează:
   - **Project URL**: arată ca `https://abcdxyz.supabase.co` → `SUPABASE_URL`
   - cheia **anon / public** → `SUPABASE_ANON_KEY`
   - cheia **service_role** (secretă) → `SUPABASE_SERVICE_ROLE_KEY`
5. **Authentication → URL Configuration**:
   - **Site URL**: `https://costi1andrei.site`
   - **Redirect URLs** → Add: `https://costi1andrei.site/?auth=1`

## 2. Google: butonul „Continuă cu Google”

1. Intră pe <https://console.cloud.google.com> → creează un proiect nou, `Aman`.
2. Caută **Google Auth Platform** → **Get started**:
   - App name: `Aman`; User support email: emailul tău
   - Audience: **External**
   - Contact: emailul tău → **Create**
3. **Branding**:
   - Application home page: `https://costi1andrei.site`
   - Privacy policy: `https://costi1andrei.site/confidentialitate.html`
   - Terms of service: `https://costi1andrei.site/termeni.html`
   - Authorized domains: `costi1andrei.site` și `supabase.co`
4. **Audience** → **Publish app** (altfel doar tu te poți loga). Folosim doar nume și email,
   deci Google nu cere verificare suplimentară.
5. **Clients** → **Create client** → **Web application**:
   - Authorized redirect URIs: `https://abcdxyz.supabase.co/auth/v1/callback`
     (pui Project URL-ul tău de la pasul 1.4 + `/auth/v1/callback`)
   - Copiază **Client ID** și **Client secret**.
6. Înapoi în Supabase: **Authentication → Sign In / Providers → Google** → Enable →
   lipește Client ID și Client secret → **Save**.

## 3. Stripe: plățile

1. Intră pe <https://dashboard.stripe.com/register> și creează contul.
   Lasă-l în **Test mode** (comutatorul din dreapta sus). Așa nu se încasează bani reali.
2. **Developers → API keys** → copiază **Secret key** (`sk_test_...`) → `AMAN_STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://costi1andrei.site/api/stripe-webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
   - După creare, **Signing secret** → Reveal → copiază (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Payment methods**: lasă Cards activ și activează **Apple Pay** și **Google Pay**.

## 4. Vercel: pune cheile

Proiectul site-ului în Vercel → **Settings → Environment Variables** → adaugă, pentru
**Production** și **Preview**:

| Nume | Valoare |
|---|---|
| `SITE_URL` | `https://costi1andrei.site` |
| `SUPABASE_URL` | de la 1.4 |
| `SUPABASE_ANON_KEY` | de la 1.4 |
| `SUPABASE_SERVICE_ROLE_KEY` | de la 1.4 (secret) |
| `AMAN_STRIPE_SECRET_KEY` | de la 3.2 (secret). Numele e diferit de `STRIPE_SECRET_KEY` pus de integrarea Stripe din Vercel, ca site-ul să nu folosească din greșeală o cheie live veche. |
| `STRIPE_WEBHOOK_SECRET` | de la 3.3 (secret) |

Apoi **Deployments → ultimul deploy → Redeploy**.

**Test rapid:** deschide `https://costi1andrei.site/#cont` → Continuă cu Google → intră.
Mergi la Prețuri → Pachete → Aleg Mini → bifezi acordul → plătești cu cardul de test
`4242 4242 4242 4242`, orice dată din viitor, orice CVC. Te întorci pe Cont și comanda
apare „Plătită · urmează să încep”.

---

## Cum gestionezi comenzile

Supabase → **Table Editor → orders**. Pentru fiecare comandă poți schimba:

- `status`: `paid` → `in_progress` (în lucru) → `review` (gata de verificare) → `delivered` (livrată).
  Mai există `cancelled` și `refunded`.
- `note`: un mesaj pe care clientul îl vede în cont (de exemplu „Am primit materialele, livrez joi”).
- `delivery_url`: linkul către fișierele finale (Google Drive, WeTransfer etc.), doar `https://`.

Clientul vede schimbarea imediat ce își deschide contul. Rambursările le faci din Stripe
(**Payments → Refund**), iar statusul devine automat `refunded`.

---

## Înainte de plăți reale (live)

Plățile reale **nu** trebuie pornite până nu e clară partea legală:

1. **Forma prin care încasezi.** Nu ai PFA. Verifică la un contabil dacă poți lucra pe
   **contract de cesiune a drepturilor de autor** (des folosit pentru design, video, foto),
   cu venitul declarat în Declarația unică, sau ce altă variantă ți se potrivește.
2. **Termenii.** În `termeni.html` completează căsuța galbenă: forma legală și adresa poștală,
   cum cere OUG 34/2014 pentru vânzările la distanță.
3. **Stripe live.** În Stripe apeși **Activate payments** și completezi datele (identitate, IBAN).
   Apoi înlocuiești în Vercel `AMAN_STRIPE_SECRET_KEY` cu cheia `sk_live_...` și creezi webhook-ul
   și în modul live, cu noul `whsec_...`. Redeploy.

## Ce e deja făcut pentru siguranță și GDPR

- Datele cardului se introduc doar la Stripe; site-ul nu le vede.
- Prețurile sunt stabilite pe server; nu pot fi modificate din browser.
- Fiecare client își vede doar comenzile lui (regulă în baza de date, RLS).
- Confirmările Stripe sunt verificate cu semnătură; cele false sau vechi sunt respinse.
- Datele sunt în UE (Supabase Frankfurt). Fonturile sunt găzduite pe site, fără Google Fonts.
- Fără cookie-uri de reclamă sau statistici, deci fără banner de cookie-uri.
- Clientul își poate descărca datele și își poate șterge contul din pagina Cont.
- Acord explicit pentru începerea lucrului înainte de 14 zile, salvat la fiecare comandă.
- Politică de confidențialitate, termeni și link ANPC SAL în subsolul fiecărei pagini.
- Headere de securitate (CSP, HSTS, anti-iframe) în `vercel.json`.
