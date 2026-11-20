# Contul de client

Clienții se loghează cu Google și văd statusul comenzilor. Site-ul **nu încasează plăți**:
plata se face prin transfer bancar, după ce stabiliți detaliile pe Instagram.

## Cum funcționează

1. Clientul apasă „Aleg” la un serviciu sau pachet și se loghează cu Google.
2. Completează formularul: ce vrea, username-ul de Instagram și materialele lui
   (poze de editat, clipuri, logo). Limita de fișiere depinde de opțiune (ex. 1 la „1 fotografie”).
3. Primește un **cod de comandă** (ex. `AM-K7P2Q`) și un mesaj gata scris, pe care ți-l trimite pe Instagram.
4. Cauți codul în panou, vezi tot ce a trimis și îi dai detaliile de plată.
5. Când primești banii, schimbi statusul. Clientul îl vede în cont.

## Cum gestionezi comenzile

Deschide **<https://costi1andrei.site/admin.html>**, logat cu Google pe contul tău.
Linkul apare și în pagina Cont, ca buton „Panou comenzi”. Au acces doar conturile din
variabila `ADMIN_USER_IDS` din Vercel (id-ul contului din Supabase → Authentication → Users).

- Apeși pe status (Cerere nouă, Plătită, În lucru, De verificat, Livrată, Anulată), iar clientul îl vede imediat.
- Scrii un mesaj pentru client și, la final, linkul cu fișierele, apoi apeși **Salvează**.
- Data plății se completează singură când pui „Plătită”.
- La **Fișiere pentru client** apeși „Adaugă fișiere” și alegi pozele/videoclipurile (maximum 50 MB fiecare).
  Clientul le vede în Cont, cu previzualizare și buton „Descarcă”. Doar el le poate vedea.
  Fișierele stau în Supabase → Storage → `livrari` (privat), într-un folder cu id-ul comenzii.

### Varianta avansată: direct în Supabase


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
  `SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USER_IDS`.

Fără aceste variabile, pagina Cont spune „în curând”, iar butoanele duc doar pe Instagram.

## Siguranță și GDPR

- Fiecare client își vede doar comenzile lui (regulă în baza de date, RLS).
  Din browser nimeni nu poate modifica statusuri sau prețuri.
- Datele stau în UE. Fonturile sunt găzduite pe site, fără Google Fonts.
- Fără cookie-uri de reclamă sau statistici, deci fără banner de cookie-uri.
- Clientul își poate descărca datele și își poate șterge contul din pagina Cont.
- Politică de confidențialitate, termeni și link ANPC SAL în subsolul fiecărei pagini.
- Headere de securitate (CSP, HSTS, anti-iframe) în `vercel.json`.

## Editorul de site-uri (`/editor.html`)

- Clientul alege un șablon (Frizerie, Cafenea/Restaurant, Salon/Beauty, Portofoliu), își scrie textele,
  urcă poze și vede site-ul live, cu watermark „Creat cu Aman”. Textele se salvează în browser; după logare, și în cont (max. 3 site-uri).
- „Vreau site-ul” creează o comandă cu cod (199 lei / €39, din `api/_lib.js` → `site-builder`).
- În panou, comanda are linkul „Vezi site-ul în editor”. Când pui **Plătită**, clientul vede butonul
  **„Descarcă site-ul (ZIP)”** în editor și în cont. Arhiva conține `index.html`, pozele și instrucțiuni de publicare, fără watermark.
- Șabloanele sunt în `assets/js/site-templates.js` (același cod face previzualizarea și arhiva finală).
- Pozele stau în spațiul privat `livrari`, folderul `sites/{id}/`.
