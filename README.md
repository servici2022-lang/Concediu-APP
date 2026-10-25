# Concediu APP

Aplicație web pentru gestionarea concediilor într-o firmă din România. În interfață apare cu numele **Leave Board**.

- **Angajații** trimit cereri de concediu și își văd soldul de zile.
- **Managerii** aprobă sau resping cererile echipei lor.
- **Administratorii** configurează utilizatorii, angajații, tipurile de concediu și sărbătorile legale.

Zilele lucrătoare se calculează automat: weekendurile și sărbătorile legale din România nu se scad din sold.

| Parte | Tehnologie | Folder |
|---|---|---|
| Interfața (frontend) | Angular 21 + Nebular | `concediuApp/` |
| Serverul (backend) | Node.js, Express 5, Mongoose 9 | `concediuBackend/` |
| Baza de date | MongoDB 7 | — |

---

## Cuprins

1. [Ce poate face aplicația](#ce-poate-face-aplicația)
2. [Cerințe](#cerințe)
3. [Instalare pe calculatorul tău (dezvoltare și test)](#instalare-pe-calculatorul-tău-dezvoltare-și-test)
4. [Instalare pe un server (producție)](#instalare-pe-un-server-producție)
5. [Actualizarea unei instalări existente](#actualizarea-unei-instalări-existente)
6. [Ghid de utilizare](#ghid-de-utilizare)
7. [Cum se calculează zilele de concediu](#cum-se-calculează-zilele-de-concediu)
8. [Probleme frecvente](#probleme-frecvente)
9. [Limitări cunoscute](#limitări-cunoscute)

---

## Ce poate face aplicația

- **Cereri de concediu** cu număr de zile lucrătoare calculat automat.
- **Aprobare și respingere**, cu motivul respingerii.
- **Sold anual**:
  - proporțional în primul an de angajare;
  - cu zilele neconsumate reportate din anul trecut;
  - cu zilele din cererile în așteptare rezervate.
- **Calendarul echipei**, cu sărbătorile legale marcate.
- **Export PDF** al cererii aprobate, cu diacritice.
- **Tipuri de concediu configurabile**: de odihnă, medical, fără plată, eveniment familial, delegație. Se pot adăuga și altele.
- **Sărbători legale**, gestionabile din aplicație.

### Roluri

| Rol | Ce poate face |
|---|---|
| **Angajat** | Își trimite cererile, le anulează cât timp concediul n-a început, își descarcă PDF-urile, vede calendarul și își schimbă parola. |
| **Manager** | Tot ce poate un angajat. În plus vede și aprobă sau respinge cererile **subordonaților direcți** și vede soldurile echipei. Nu își poate aproba propria cerere. |
| **Administrator** | Tot. Gestionează utilizatorii, profilurile de angajat, tipurile de concediu și sărbătorile. Poate anula și un concediu aprobat care a început deja. |

---

## Cerințe

- **Node.js 22 sau 24 (LTS)**, cu npm.
  - Windows: `winget install OpenJS.NodeJS.LTS`
  - Linux: pachetul `nodejs` de la [NodeSource](https://github.com/nodesource/distributions), sau `nvm`.
- **MongoDB 7**, în una din variantele:
  - **Docker**, varianta cea mai simplă. Fișierul `concediuBackend/docker-compose.yml` e gata făcut.
  - **MongoDB Community Server** instalat direct. Windows: `winget install MongoDB.Server`. Linux: [ghidul oficial](https://www.mongodb.com/docs/manual/administration/install-on-linux/).
- **Git**, ca să descarci proiectul.

---

## Instalare pe calculatorul tău (dezvoltare și test)

### 1. Descarcă proiectul

```bash
git clone https://github.com/servici2022-lang/Concediu-APP.git
cd Concediu-APP
```

### 2. Pornește MongoDB

Cu Docker:

```bash
cd concediuBackend
docker compose up -d
cd ..
```

Dacă ai MongoDB instalat direct, asigură-te doar că serviciul rulează pe portul 27017.

### 3. Configurează și pornește serverul (backend)

```bash
cd concediuBackend
npm install
cp .env.example .env          # pe Windows (PowerShell): Copy-Item .env.example .env
```

Deschide `.env` și completează cele două secrete JWT. **Serverul nu pornește fără ele.** Generează câte un secret diferit pentru fiecare, rulând de două ori:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Pune primul rezultat la `JWT_SECRET=`, iar al doilea la `JWT_REFRESH_SECRET=`.

Creează contul de administrator, tipurile de concediu și sărbătorile legale, apoi pornește serverul:

```bash
npm run seed
npm run dev        # pornește pe http://localhost:3000 și repornește singur la modificări
```

Verificare: http://localhost:3000/api/health trebuie să răspundă `{"status":"ok"}`.

### 4. Pornește interfața (frontend)

Într-un terminal nou:

```bash
cd concediuApp
npm install
npm start
```

Deschide **http://localhost:4200**. Colegii din aceeași rețea pot intra la `http://<IP-ul-calculatorului>:4200`.

### 5. Prima autentificare

| Email | Parolă |
|---|---|
| `admin@concediu.ro` | `Admin123!` |

**Schimbă parola imediat:** din meniul utilizatorului (dreapta sus) alege **Profil → Schimbare parolă**. Emailul și parola inițială se pot modifica înainte de `npm run seed`, în `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

---

## Instalare pe un server (producție)

Exemplul e pentru un server Linux (Ubuntu sau Debian) cu nginx. Aplicația și MongoDB rulează pe același server.

### 1. MongoDB

Instalează MongoDB sau folosește Docker. Dacă folosești `docker-compose.yml`, schimbă linia de port în `"127.0.0.1:27017:27017"`. Altfel baza de date, care nu are parolă, ar fi accesibilă din toată rețeaua.

### 2. Backend ca serviciu

```bash
sudo mkdir -p /opt && cd /opt
sudo git clone https://github.com/servici2022-lang/Concediu-APP.git
cd Concediu-APP/concediuBackend
sudo npm ci --omit=dev
sudo cp .env.example .env
sudo nano .env      # NODE_ENV=production, secretele JWT, MONGO_URI
sudo npm run seed
```

Creează fișierul `/etc/systemd/system/concediu.service`:

```ini
[Unit]
Description=Concediu APP backend
After=network.target

[Service]
WorkingDirectory=/opt/Concediu-APP/concediuBackend
ExecStart=/usr/bin/node src/server.js
Restart=always
User=www-data
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now concediu
sudo systemctl status concediu
```

### 3. Frontend (fișiere statice)

```bash
cd /opt/Concediu-APP/concediuApp
npm ci
npm run build
sudo mkdir -p /var/www/concediuApp
sudo cp -r dist/concediuApp/browser/* /var/www/concediuApp/
```

Build-ul de producție apelează serverul prin `/api`, pe aceeași adresă. Nu e nevoie să deschizi portul 3000 în firewall.

### 4. nginx

```bash
sudo cp /opt/Concediu-APP/concediuBackend/nginx.conf /etc/nginx/sites-available/concediu
sudo ln -s /etc/nginx/sites-available/concediu /etc/nginx/sites-enabled/concediu
sudo nginx -t && sudo systemctl reload nginx
```

Aplicația e disponibilă la `http://<adresa-serverului>/`.

**Recomandat:** activează HTTPS, de exemplu cu `certbot --nginx`. Fără el, parolele circulă necriptat prin rețea.

---

## Actualizarea unei instalări existente

Fă pașii aceștia după fiecare `git pull`. Unii sunt **obligatorii la actualizarea din octombrie 2026**.

```bash
git pull

# Backend
cd concediuBackend
npm install
```

1. **Verifică secretele JWT din `.env`** (obligatoriu).
   - Serverul refuză acum să pornească dacă `JWT_SECRET` sau `JWT_REFRESH_SECRET` lipsesc, sunt valorile din exemplu (`change-this…`), au sub 32 de caractere sau sunt identice.
   - Generează secrete noi cu comanda din secțiunea de instalare.
   - Toți utilizatorii vor trebui să se autentifice din nou.
2. **Adaugă sărbătorile noi:** rulează `npm run seed`.
   - Se adaugă Boboteaza și Sf. Ioan (6 și 7 ianuarie, zile libere din 2024), plus Paștele și Rusaliile pentru anul trecut și următorii 5 ani.
   - Contul de admin și datele existente nu se modifică.
3. **Recalculează zilele cererilor existente.** Cererile care includeau 6–7 ianuarie aveau zilele numărate greșit.
   ```bash
   npm run recalc:days              # doar afișează ce s-ar schimba
   npm run recalc:days -- --apply   # aplică corecțiile
   ```
4. **Repornește serverul**, de exemplu cu `sudo systemctl restart concediu`.

Apoi refă build-ul interfeței și copiază-l din nou:

```bash
cd ../concediuApp
npm install
npm run build
sudo cp -r dist/concediuApp/browser/* /var/www/concediuApp/
```

După această actualizare, fiecare utilizator trebuie să se autentifice o dată din nou, pentru că sesiunile se salvează acum criptat.

---

## Ghid de utilizare

### Administrator: configurarea inițială

1. **Utilizatori → Nou.** Creezi contul fiecărei persoane: nume, email, parolă inițială și rol.
   - Parola trebuie să aibă minim 8 caractere, cu literă mare, literă mică și cifră.
2. **Angajați → Adaugă.** Fiecărui utilizator care ia concediu îi creezi profilul de angajat:
   - departament și funcție;
   - **data angajării**, din care se calculează soldul proporțional din primul an;
   - **zile CO/an**: implicit 21, minimul legal;
   - **managerul**, cel care îi aprobă cererile.

   Fără profil de angajat, persoana se poate autentifica, dar nu poate trimite cereri.
3. **Tipuri concediu.** Verifică tipurile create automat. Doar cele cu opțiunea **„Se scade din zile”** activă consumă zile din soldul anual.
4. **Sărbători legale.** Verifică lista.
   - Sărbătorile cu dată fixă se marchează „se repetă anual”.
   - Paștele și Rusaliile **nu** se marchează așa: au altă dată în fiecare an și sunt deja adăugate pe ani.

Dacă un angajat pleacă din firmă, **dezactivează-i contul** din Utilizatori. Profilul unui angajat care are cereri de concediu nu se poate șterge, ca să rămână istoricul.

### Angajat

- **Cerere nouă**
  1. Alege tipul concediului, data de început și data de sfârșit.
  2. Aplicația afișează imediat câte zile lucrătoare conține intervalul.
  3. Adaugă opțional un motiv și apasă **Trimite**.
- **Cererile mele.** Vezi statusul fiecărei cereri: în așteptare, aprobată, respinsă sau anulată.
  - **Anulare:** o cerere în așteptare se poate anula oricând. Una aprobată se poate anula doar până în ziua dinaintea începerii concediului. După aceea, anularea o poate face doar un administrator.
  - **PDF:** pentru cererile aprobate, butonul de descărcare generează cererea de concediu semnabilă.
- **Calendar.** Vezi concediile colegilor și sărbătorile legale, lună cu lună.
- **Profil.** Vezi soldul anului (zile totale, folosite, în așteptare și disponibile) și îți poți schimba parola. După schimbare, te autentifici din nou cu parola nouă.

### Manager

- **Cereri de concediu.** Lângă cererile subordonaților în așteptare apar butoanele **Aprobă** și **Respinge**. Respingerea cere un motiv.
- **Dashboard.** Vezi statisticile și soldurile echipei tale: subordonații direcți și tu.
- Propriile cereri ale managerului le aprobă managerul lui sau un administrator.

---

## Cum se calculează zilele de concediu

- **Zile lucrătoare.** Se numără doar zilele de luni până vineri care nu sunt sărbători legale. Un concediu de luni până vineri care include o sărbătoare consumă 4 zile.
- **Anul calendaristic.** Soldul e pe an (1 ianuarie – 31 decembrie). O cerere se verifică față de soldul **anului în care e concediul**.
- **Cereri peste Revelion.** O cerere de concediu de odihnă nu poate trece de 31 decembrie. Se fac două cereri: până pe 31 decembrie și de la 1 ianuarie.
- **Primul an.** Zilele se acordă proporțional cu lunile rămase, inclusiv luna angajării. Exemplu: angajat în octombrie, cu 21 de zile pe an, primește 21 × 3 / 12 ≈ 5 zile.
- **Reportul.** Zilele neconsumate din anul trecut se adaugă la anul curent.
- **Rezervarea.** Cererile în așteptare rezervă zilele: nu le mai poți cere a doua oară până nu se decide.

---

## Probleme frecvente

| Mesaj sau simptom | Ce faci |
|---|---|
| Serverul se oprește cu `Insecure JWT configuration in .env` | Completează `JWT_SECRET` și `JWT_REFRESH_SECRET` în `.env` cu valori generate (vezi pasul 3 de la instalare). |
| `MongoDB connection error` | MongoDB nu rulează sau `MONGO_URI` din `.env` e greșit. Cu Docker: `docker compose up -d` în `concediuBackend`. |
| „Employee profile not found” la trimiterea unei cereri | Utilizatorul nu are profil de angajat. Adminul îl creează din **Angajați → Adaugă** (butonul „Adauga”). |
| „Insufficient leave balance for 2027…” | Nu mai sunt zile disponibile în anul acela, inclusiv cele rezervate de cererile în așteptare. |
| Interfața nu se încarcă după `npm install`, cu o eroare despre `_VIEW_REPEATER_STRATEGY` | Rulează `node scripts/patch-cdk.js` în `concediuApp`. Se rulează și automat la `npm install`. |
| Port ocupat (3000 sau 4200) | Oprește programul care folosește portul sau schimbă `PORT` din `.env` (backend). |

---

## Limitări cunoscute

Lucruri care funcționează, dar pe care merită să le ai în vedere:

- **Calendarul** e vizibil tuturor angajaților și arată tipul concediului, inclusiv „Concediu medical”. Dacă vrei ca tipul să fie văzut doar de manageri și admini (date de sănătate, GDPR), e o modificare de făcut.
- **Fusul orar.** Aplicația presupune că toți utilizatorii au fusul orar al României. Pe un calculator setat pe alt fus orar, datele pot apărea cu o zi decalate.
- **Mesajele de eroare de la server** sunt în engleză, iar interfața e în română.
- **MongoDB fără parolă.** Ține baza de date accesibilă doar local (vezi instalarea în producție).
- **Backend-ul nu are teste automate.** Frontend-ul are teste minimale (`npm test`).

---

## Comenzi utile

| Unde | Comandă | Ce face |
|---|---|---|
| `concediuBackend` | `npm run dev` | Pornește serverul în modul dezvoltare |
| `concediuBackend` | `npm start` | Pornește serverul |
| `concediuBackend` | `npm run seed` | Creează adminul, tipurile de concediu și sărbătorile (se poate rula de mai multe ori) |
| `concediuBackend` | `npm run recalc:days` | Verifică zilele lucrătoare salvate la cererile existente (`-- --apply` le corectează) |
| `concediuApp` | `npm start` | Pornește interfața pe portul 4200 |
| `concediuApp` | `npm run build` | Build de producție în `dist/concediuApp/browser` |
| `concediuApp` | `npm test` | Rulează testele interfeței |
