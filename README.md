# Concediu APP

Aplicație web pentru gestionarea concediilor într-o firmă din România. În interfață apare cu numele **Leave Board**.

- **Angajații** trimit cereri de concediu și își văd soldul de zile.
- **Managerii** aprobă sau resping cererile echipei lor.
- **Administratorii** configurează utilizatorii, angajații, tipurile de concediu și sărbătorile legale.

Zilele lucrătoare se calculează automat: weekendurile și sărbătorile legale din România nu se scad din sold.

---

## Instalare: alege sistemul

| Sistem | Cum rulează | Ghid |
|---|---|---|
| **Windows** | Un singur fișier, `Concediu-APP.exe`, plus `config.env` pentru conexiunea la baza de date. Nu se instalează nimic în afară de MongoDB. | **[windows/README.md](windows/README.md)** · [descarcă](https://github.com/servici2022-lang/Concediu-APP/releases/latest) |
| **Linux (server)** | nginx + serviciu systemd + MongoDB, pe Ubuntu/Debian | **[linux/README.md](linux/README.md)** |

În ambele variante, utilizatorii deschid aplicația în browser, de pe orice calculator din rețea. Pentru programatori, pornirea în modul dezvoltare e descrisă mai jos, la [Dezvoltare](#dezvoltare).

---

## Cuprins

1. [Ce poate face aplicația](#ce-poate-face-aplicația)
2. [Structura proiectului](#structura-proiectului)
3. [Ghid de utilizare](#ghid-de-utilizare)
4. [Cum se calculează zilele de concediu](#cum-se-calculează-zilele-de-concediu)
5. [Dezvoltare](#dezvoltare)
6. [Probleme frecvente](#probleme-frecvente)
7. [Limitări cunoscute](#limitări-cunoscute)

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

## Structura proiectului

| Folder | Conținut |
|---|---|
| [`concediuApp/`](concediuApp) | Interfața: Angular 21 + Nebular |
| [`concediuBackend/`](concediuBackend) | Serverul: Node.js, Express 5, Mongoose 9 (MongoDB) |
| [`windows/`](windows) | Varianta Windows: ghidul de instalare și scriptul care construiește `Concediu-APP.exe` |
| [`linux/`](linux) | Varianta Linux: ghidul de instalare, configurația nginx și serviciul systemd |

---

## Ghid de utilizare

### Prima autentificare

Contul de administrator se creează la prima pornire, sau cu `npm run seed` pe Linux:

| Email | Parolă |
|---|---|
| `admin@concediu.ro` | `Admin123!` |

Valorile se pot schimba înainte de prima pornire: `ADMIN_EMAIL` și `ADMIN_PASSWORD`, în `config.env` (Windows) sau `.env` (Linux).

**Schimbă parola imediat:** din meniul utilizatorului (dreapta sus) alege **Profil → Schimbare parolă**.

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

## Dezvoltare

Pentru programatori, pe Windows sau Linux. Ai nevoie de **Node.js 22 sau 24**, **Git** și **MongoDB 7 sau mai nou**. MongoDB poate rula în Docker, cu `docker compose up -d` în `concediuBackend`, sau instalat local. Instalarea și configurarea MongoDB sunt descrise pas cu pas în ghidul [Windows](windows/README.md#2-mongodb) și în cel [Linux](linux/README.md#2-mongodb).

```bash
git clone https://github.com/servici2022-lang/Concediu-APP.git
cd Concediu-APP
```

**Serverul**, într-un terminal:

```bash
cd concediuBackend
npm install
cp .env.example .env          # Windows (PowerShell): Copy-Item .env.example .env
```

În `.env` completează `JWT_SECRET` și `JWT_REFRESH_SECRET` cu două valori diferite. **Serverul nu pornește fără ele.** Fiecare valoare se generează cu:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Apoi:

```bash
npm run seed       # adminul, tipurile de concediu, sărbătorile
npm run dev        # http://localhost:3000, repornește singur la modificări
```

**Interfața**, într-un al doilea terminal:

```bash
cd concediuApp
npm install
npm start          # http://localhost:4200, accesibilă și din rețea
```

Comenzi utile:

| Unde | Comandă | Ce face |
|---|---|---|
| `concediuBackend` | `npm run dev` / `npm start` | Pornește serverul, cu sau fără repornire automată |
| `concediuBackend` | `npm run seed` | Creează adminul, tipurile de concediu și sărbătorile (se poate rula de mai multe ori) |
| `concediuBackend` | `npm run recalc:days` | Verifică zilele lucrătoare salvate la cererile existente (`-- --apply` le corectează) |
| `concediuBackend` | `npm run build:exe` | Construiește varianta Windows, vezi [windows/README.md](windows/README.md#10-construirea-exe-ului-din-codul-sursă) |
| `concediuApp` | `npm run build` | Build de producție în `dist/concediuApp/browser` |
| `concediuApp` | `npm test` | Rulează testele interfeței |

---

## Probleme frecvente

Problemele specifice instalării sunt descrise în [windows/README.md](windows/README.md#9-probleme-frecvente) și [linux/README.md](linux/README.md#11-probleme-frecvente).

| Mesaj sau simptom | Ce faci |
|---|---|
| „Employee profile not found” la trimiterea unei cereri | Utilizatorul nu are profil de angajat. Adminul îl creează din **Angajați → Adaugă**. |
| „Insufficient leave balance for 2027…” | Nu mai sunt zile disponibile în anul acela, inclusiv cele rezervate de cererile în așteptare. |
| „This leave has already started and can no longer be cancelled” | Concediul aprobat a început. Anularea o poate face doar un administrator. |
| Eroare despre `_VIEW_REPEATER_STRATEGY` la build-ul interfeței | Rulează `node scripts/patch-cdk.js` în `concediuApp`. Se rulează și automat la `npm install`. |

---

## Limitări cunoscute

Lucruri care funcționează, dar pe care merită să le ai în vedere:

- **Calendarul** e vizibil tuturor angajaților și arată tipul concediului, inclusiv „Concediu medical”. Dacă vrei ca tipul să fie văzut doar de manageri și admini (date de sănătate, GDPR), e o modificare de făcut.
- **Fusul orar.** Aplicația presupune că toți utilizatorii au fusul orar al României. Pe un calculator setat pe alt fus orar, datele pot apărea cu o zi decalate.
- **Mesajele de eroare de la server** sunt în engleză, iar interfața e în română.
- **Resetarea parolei.** Un administrator nu poate reseta din interfață parola altui utilizator. Fiecare își schimbă parola din **Profil**. Pentru un admin care și-a uitat parola, vezi problemele frecvente din ghidul [Windows](windows/README.md#9-probleme-frecvente) sau [Linux](linux/README.md#11-probleme-frecvente).
- **MongoDB fără parolă.** Ține baza de date accesibilă doar local, cum e descris în ghidurile de instalare.
- **Backend-ul nu are teste automate.** Frontend-ul are teste minimale (`npm test`).
