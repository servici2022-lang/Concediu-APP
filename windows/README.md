# Concediu APP pe Windows

Pe Windows, aplicația vine ca un singur fișier, **`Concediu-APP.exe`**, care conține serverul, interfața și Node.js. Nu instalezi nimic în afară de baza de date. Setările stau într-un fișier text, **`config.env`**, aflat lângă exe.

Același calculator poate fi folosit ca „server” pentru toată firma: colegii din rețea deschid aplicația în browser, la adresa acestui calculator.

> Pentru instalarea pe un server Linux vezi [`../linux/README.md`](../linux/README.md). Pentru folosirea aplicației (cereri, aprobări, sold) vezi [README-ul principal](../README.md#ghid-de-utilizare).

---

## Cuprins

1. [Descărcare](#1-descărcare)
2. [MongoDB](#2-mongodb)
3. [Configurare: config.env](#3-configurare-configenv)
4. [Pornire](#4-pornire)
5. [Acces din rețea](#5-acces-din-rețea)
6. [Pornire automată odată cu Windows](#6-pornire-automată-odată-cu-windows)
7. [Actualizare](#7-actualizare)
8. [Backup](#8-backup)
9. [Probleme frecvente](#9-probleme-frecvente)
10. [Construirea exe-ului din codul sursă](#10-construirea-exe-ului-din-codul-sursă)

---

## 1. Descărcare

1. Intră pe pagina **[Releases](https://github.com/servici2022-lang/Concediu-APP/releases/latest)** și descarcă **`Concediu-APP-windows.zip`**.
2. Dezarhivează-l într-un folder unde ai drept de scriere, de exemplu `C:\ConcediuAPP`. Nu în `C:\Program Files`, pentru că aplicația scrie în `config.env`.

Conținutul folderului:

| Fișier | Rol |
|---|---|
| `Concediu-APP.exe` | Aplicația. Pornește cu dublu-click. |
| `config.env` | Configurarea: baza de date, portul, contul de admin inițial |
| `CITESTE-MA.txt` | Instrucțiuni scurte |

## 2. MongoDB

MongoDB e baza de date în care aplicația își păstrează toate datele. Aplicația merge cu **MongoDB 7 sau mai nou**: e testată cu 7.0 și cu 9.0, versiunea instalată acum de `winget`. Alege una din variante:

| Situație | Ce pași faci |
|---|---|
| **A. MongoDB pe același calculator cu aplicația** (recomandat la început) | [2.1 Instalare](#21-instalare) → [2.2 Același calculator](#22-configurare-pe-același-calculator), plus, recomandat, [2.3 Parolă](#23-utilizator-și-parolă-recomandat) |
| **B. MongoDB pe alt calculator sau server din rețea** | Pe calculatorul cu MongoDB: [2.1](#21-instalare) → [2.3 Parolă](#23-utilizator-și-parolă-recomandat) → [2.4 Acces din rețea](#24-mongodb-pe-alt-calculator-acces-din-rețea) |
| **C. MongoDB Atlas, în cloud** (nu instalezi nimic) | [2.5 MongoDB Atlas](#25-mongodb-atlas-cloud) |

### 2.1 Instalare

Într-un PowerShell sau Command Prompt:

```powershell
winget install MongoDB.Server          # serverul MongoDB, instalat ca serviciu Windows
winget install MongoDB.Shell           # mongosh: consola pentru comenzi (necesară la pasul 2.3)
winget install MongoDB.Compass.Full    # opțional: interfață grafică pentru vizualizarea datelor
```

**Alternativă fără winget:** descarcă installer-ul de pe [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) (Windows, msi). La instalare:
1. Alege **Complete**.
2. Lasă bifat **„Install MongoD as a Service”**.
3. Bifează opțional **MongoDB Compass**.

**Verificare.** Serviciul trebuie să ruleze și să răspundă:

```powershell
Get-Service MongoDB                                   # Status: Running
mongosh --quiet --eval "db.runCommand({ ping: 1 })"   # { ok: 1 }
```

Dacă `Get-Service MongoDB` nu găsește serviciul, reinstalează cu installer-ul msi și bifează „Install MongoD as a Service”.

Unde sunt fișierele (`<versiune>` e de forma `9.0`):

| Ce | Unde |
|---|---|
| Configurarea MongoDB | `C:\Program Files\MongoDB\Server\<versiune>\bin\mongod.cfg` |
| Datele | `C:\Program Files\MongoDB\Server\<versiune>\data\` |
| Jurnalul (pentru erori) | `C:\Program Files\MongoDB\Server\<versiune>\log\mongod.log` |

### 2.2 Configurare pe același calculator

Nu trebuie schimbat nimic. MongoDB ascultă implicit doar pe acest calculator (`127.0.0.1:27017`), deci nu e accesibil din rețea. În `config.env`:

```ini
MONGO_URI=mongodb://localhost:27017/concediu
```

Baza de date `concediu` se creează singură la prima pornire a aplicației.

### 2.3 Utilizator și parolă (recomandat)

Fără parolă, orice program de pe calculatorul cu MongoDB poate citi datele. **Dacă MongoDB e accesibil din rețea (varianta B), parola e obligatorie.**

**1. Creează utilizatorii.** Deschide consola MongoDB cu comanda `mongosh`, apoi scrie pe rând:

```js
use admin
db.createUser({ user: "admin", pwd: passwordPrompt(), roles: ["root"] })

use concediu
db.createUser({ user: "concediu", pwd: passwordPrompt(), roles: [{ role: "readWrite", db: "concediu" }] })

exit
```

- `passwordPrompt()` îți cere parola fără s-o afișeze pe ecran.
- `admin` e administratorul MongoDB, pentru întreținere și backup.
- `concediu` e utilizatorul aplicației și are drepturi doar pe baza `concediu`.
- Folosește parole din litere și cifre: caracterele `@ : / ? # %` trebuie codificate în `MONGO_URI`.

**2. Pornește verificarea parolei.**
1. Deschide **Notepad ca Administrator** (click dreapta → Run as administrator).
2. Deschide `mongod.cfg` (vezi tabelul de la 2.1) și adaugă la final:

   ```yaml
   security:
     authorization: enabled
   ```
   `security:` stă la începutul rândului, iar `authorization` are în față exact **2 spații**, nu tab. Dacă în fișier există deja o linie `#security:`, înlocuiește-o pe aceea.

**3. Repornește MongoDB.** Într-un PowerShell deschis ca Administrator:

```powershell
Restart-Service MongoDB
```

**4. Pune utilizatorul în `config.env`:**

```ini
MONGO_URI=mongodb://concediu:PAROLA@localhost:27017/concediu
```

**Test:**

```powershell
mongosh "mongodb://concediu:PAROLA@localhost:27017/concediu" --quiet --eval "db.runCommand({ ping: 1 })"
```

Dacă după repornire serviciul nu mai pornește, ai o greșeală de indentare în `mongod.cfg`. Detaliile sunt în `mongod.log`.

### 2.4 MongoDB pe alt calculator (acces din rețea)

Pașii de mai jos se fac **pe calculatorul cu MongoDB**, după [2.3](#23-utilizator-și-parolă-recomandat). Nu deschide niciodată MongoDB spre rețea fără parolă. În exemplu, calculatorul cu MongoDB are IP-ul `192.168.1.50`, iar cel cu aplicația `192.168.1.20`.

**1. Ascultă și pe IP-ul din rețea.** În `mongod.cfg` (Notepad ca Administrator), secțiunea `net` devine:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1,192.168.1.50
```

**2. Repornește serviciul:** `Restart-Service MongoDB`, în PowerShell ca Administrator.

**3. Permite în firewall doar calculatorul cu aplicația.** În PowerShell ca Administrator:

```powershell
netsh advfirewall firewall add rule name="MongoDB" dir=in action=allow protocol=TCP localport=27017 remoteip=192.168.1.20 profile=private
```

**Pe calculatorul cu aplicația**, în `config.env`:

```ini
MONGO_URI=mongodb://concediu:PAROLA@192.168.1.50:27017/concediu
```

Testul conexiunii, rulat de pe calculatorul cu aplicația: `Test-NetConnection 192.168.1.50 -Port 27017` trebuie să afișeze `TcpTestSucceeded : True`.

### 2.5 MongoDB Atlas (cloud)

1. **Contul:** îți faci cont pe [mongodb.com/atlas](https://www.mongodb.com/atlas) și creezi un cluster. Varianta **M0** e gratuită. Alege o regiune din Europa.
2. **Utilizatorul:** în **Database Access → Add New Database User**, alegi un utilizator și o parolă, cu rolul „Read and write to any database”.
3. **Accesul:** în **Network Access → Add IP Address**, adaugi adresa IP publică a firmei.
4. **Conexiunea:** în **Connect → Drivers**, copiezi șirul de conexiune și adaugi `/concediu` înainte de `?`:

   ```ini
   MONGO_URI=mongodb+srv://utilizator:parola@cluster0.xxxxx.mongodb.net/concediu?retryWrites=true&w=majority
   ```

### Vizualizarea datelor (opțional)

Cu **MongoDB Compass** te conectezi cu același șir ca în `MONGO_URI`. Deschizi baza `concediu`, iar colecțiile sunt:
- `users`: conturile;
- `employees`: profilurile de angajat;
- `leaverequests`: cererile;
- `leavetypes`: tipurile de concediu;
- `holidays`: sărbătorile.

Modificările se fac din aplicație, nu direct în baza de date.

## 3. Configurare: `config.env`

Deschide `config.env` cu Notepad. De obicei trebuie modificat doar `MONGO_URI`:

```ini
# MongoDB pe același calculator (varianta A)
MONGO_URI=mongodb://localhost:27017/concediu

# MongoDB cu utilizator și parolă (vezi 2.3)
# MONGO_URI=mongodb://concediu:PAROLA@localhost:27017/concediu

# MongoDB pe alt calculator din rețea (varianta B, vezi 2.4)
# MONGO_URI=mongodb://concediu:PAROLA@192.168.1.50:27017/concediu

# MongoDB Atlas (varianta C)
# MONGO_URI=mongodb+srv://utilizator:parola@cluster0.xxxxx.mongodb.net/concediu
```

Trebuie să rămână o singură linie `MONGO_URI` activă. Pune `#` în fața celorlalte. Ultima parte din adresă (`/concediu`) e numele bazei de date. Se creează singură.

Toate setările:

| Setare | Implicit | Ce face |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/concediu` | Conexiunea la baza de date |
| `PORT` | `3000` | Portul aplicației: `http://localhost:3000` |
| `OPEN_BROWSER` | `true` | Deschide browserul la pornire (`true` sau `false`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@concediu.ro`, `Admin123!` | Contul de administrator creat **doar la prima pornire**, pe o bază de date goală |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | generate automat | Secretele de securitate. **Nu le modifica.** Dacă le schimbi, toți utilizatorii trebuie să se autentifice din nou. |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | `1h`, `7d` | Durata sesiunii |
| `NODE_ENV` | `production` | Lasă așa |

După orice modificare în `config.env`, închide și pornește din nou aplicația.

## 4. Pornire

Dublu-click pe **`Concediu-APP.exe`**. Se deschide o fereastră cu jurnalul aplicației, apoi browserul la **http://localhost:3000**.

- **Prima autentificare:** `admin@concediu.ro` / `Admin123!`. Schimbă parola imediat, din meniul din dreapta sus → **Profil → Schimbare parolă**.
- **Ce urmează:** creează utilizatorii și profilurile de angajat, după [ghidul pentru administrator](../README.md#administrator-configurarea-inițială).

Ce face aplicația singură:

| Când | Ce face |
|---|---|
| Prima pornire | Creează `config.env` dacă lipsește și generează secretele de securitate |
| Baza de date e goală | Creează contul de administrator, cele 5 tipuri de concediu și sărbătorile legale |
| La fiecare pornire | Adaugă Paștele și Rusaliile pentru anii care lipsesc (anul trecut și următorii 5) |

**Aplicația merge cât timp fereastra e deschisă.** Pentru oprire, închide fereastra.

La prima pornire, **Windows SmartScreen** poate afișa „Windows protected your PC”, pentru că exe-ul nu e semnat digital. Alege **More info → Run anyway**. La fel, dacă antivirusul blochează exe-ul, adaugă o excepție pentru folderul aplicației.

## 5. Acces din rețea

În fereastra aplicației apar adresele la care pot intra colegii, de exemplu:

```
  Concediu APP rulează. Deschide în browser:
    http://localhost:3000
    http://192.168.1.20:3000      <- adresa pentru colegi
```

La prima pornire, **Windows Firewall** întreabă dacă permiți accesul. Bifează **Private networks** și apasă **Allow access**.

Dacă ai refuzat din greșeală, adaugă regula manual. Deschide un PowerShell ca Administrator și rulează:

```powershell
netsh advfirewall firewall add rule name="Concediu APP" dir=in action=allow protocol=TCP localport=3000 profile=private
```

Ca adresa să nu se schimbe, setează în router un IP fix (rezervare DHCP) pentru calculatorul pe care rulează aplicația.

## 6. Pornire automată odată cu Windows

**Varianta simplă: la autentificarea în Windows.**
1. Apasă **Win+R**, scrie `shell:startup` și apasă Enter.
2. În folderul deschis, creează o scurtătură (shortcut) către `C:\ConcediuAPP\Concediu-APP.exe`.
3. Ca să nu se deschidă browserul de fiecare dată, pune `OPEN_BROWSER=false` în `config.env`.

**Varianta „server”: pornește la boot, fără ca cineva să se autentifice.** Folosește Task Scheduler:
1. Deschide **Task Scheduler → Create Task**.
2. **General:** bifează „Run whether user is logged on or not”.
3. **Triggers:** adaugă „At startup”.
4. **Actions:** alege „Start a program”, cu `C:\ConcediuAPP\Concediu-APP.exe` și **Start in** = `C:\ConcediuAPP`.
5. **Settings:** debifează „Stop the task if it runs longer than…”.

## 7. Actualizare

1. Închide aplicația.
2. Descarcă noul `Concediu-APP-windows.zip` din [Releases](https://github.com/servici2022-lang/Concediu-APP/releases/latest).
3. Înlocuiește **doar** `Concediu-APP.exe`. **Păstrează `config.env`**: în el sunt setările și secretele.
4. Pornește aplicația.

Datele sunt în MongoDB, deci nu se pierde nimic la actualizare.

## 8. Backup

Toate datele (utilizatori, angajați, cereri) sunt în MongoDB. Pentru backup instalează uneltele MongoDB:

```powershell
winget install MongoDB.DatabaseTools
```

Comenzile, rulate într-un terminal:

```powershell
# backup
mongodump --uri "mongodb://localhost:27017/concediu" --out "D:\Backup\concediu-$(Get-Date -Format yyyy-MM-dd)"

# restaurare
mongorestore --uri "mongodb://localhost:27017/concediu" --drop "D:\Backup\concediu-2026-10-25\concediu"
```

Dacă MongoDB are parolă ([2.3](#23-utilizator-și-parolă-recomandat)), folosește în comenzi utilizatorul `admin`: `--uri "mongodb://admin:PAROLA@localhost:27017/concediu?authSource=admin"`.

Păstrează și o copie a `config.env`.

## 9. Probleme frecvente

| Mesaj sau simptom | Cauza și soluția |
|---|---|
| `MongoDB connection error (...): connect ECONNREFUSED` | MongoDB nu rulează sau adresa e greșită. Verifică serviciul **MongoDB** în `services.msc` și `MONGO_URI` din `config.env`. |
| `MongoDB connection error (...): Authentication failed` | Utilizator sau parolă greșite în `MONGO_URI`. Utilizatorul `concediu` de la [2.3](#23-utilizator-și-parolă-recomandat) e creat în baza `concediu`. Dacă folosești unul creat în baza `admin`, adaugă `?authSource=admin` la final. |
| `MongoDB requires a user with access to database "concediu"`, `requires authentication` sau `not authorized on concediu` | MongoDB cere parolă, dar `MONGO_URI` nu are utilizator și parolă, sau utilizatorul nu are drepturi pe baza `concediu`. Vezi [2.3, pașii 1 și 4](#23-utilizator-și-parolă-recomandat). |
| Serviciul MongoDB nu mai pornește după ce ai modificat `mongod.cfg` | Greșeală de indentare. Folosește doar spații, nu tab-uri, câte 2 sub `security:` și `net:`. Cauza exactă e în `mongod.log`. |
| `Port 3000 is used by another program` | Alt program folosește portul. Pune `PORT=3001` în `config.env` și intră la `http://localhost:3001`. |
| `Nu pot scrie fișierul de configurare` | Folderul nu permite scrierea, de exemplu e în `C:\Program Files`. Mută-l în `C:\ConcediuAPP`. |
| Colegii nu pot intra | Verifică regula din Windows Firewall ([secțiunea 5](#5-acces-din-rețea)) și că folosesc adresa IP afișată în fereastră, cu portul. |
| Fereastra se închide imediat | Deschide un Command Prompt în folderul aplicației și pornește `Concediu-APP.exe` de acolo, ca să vezi mesajul. |
| Ai uitat parola de admin | Aplicația nu are încă resetare de parolă. Creezi un administrator nou, fără să pierzi date: în `config.env` pui un `ADMIN_EMAIL` nou (un email care nu există încă în aplicație) și un `ADMIN_PASSWORD`, apoi rulezi o dată `Concediu-APP.exe --seed` dintr-un Command Prompt deschis în folderul aplicației. Te autentifici cu noul cont și, dacă vrei, dezactivezi contul vechi din **Utilizatori**. |

Opțiuni avansate:
- `Concediu-APP.exe --seed` reface datele inițiale (tipuri de concediu, sărbători) și se oprește. Atenție: suprascrie modificările făcute celor 5 tipuri de concediu implicite.
- Variabila de mediu `CONCEDIU_CONFIG=C:\cale\catre\alt.env` folosește alt fișier de configurare. Așa poți rula două instanțe, cu porturi și baze de date diferite.

## 10. Construirea exe-ului din codul sursă

Pentru programatori, pe un calculator Windows cu [Node.js 22 sau 24](https://nodejs.org) și Git:

```powershell
git clone https://github.com/servici2022-lang/Concediu-APP.git
cd Concediu-APP\concediuBackend
npm install
npm run build:exe
```

Scriptul [`build-exe.js`](build-exe.js) face pe rând:
1. build-ul de producție al interfeței (`concediuApp`);
2. copierea lui în `concediuBackend/public/`;
3. împachetarea serverului, a interfeței și a Node.js 24 cu [`@yao-pkg/pkg`](https://github.com/yao-pkg/pkg).

Rezultatul e în **`release/windows/`**:
- `Concediu-APP.exe`;
- `config.env`, cu secretele goale, generate la prima pornire;
- [`CITESTE-MA.txt`](CITESTE-MA.txt).

Fișierele din acest folder:

| Fișier | Rol |
|---|---|
| [`build-exe.js`](build-exe.js) | Scriptul de build al exe-ului |
| [`CITESTE-MA.txt`](CITESTE-MA.txt) | Instrucțiunile scurte incluse în arhivă |

Șablonul pentru `config.env` și logica specifică exe-ului (citirea `config.env`, prima pornire) sunt în `concediuBackend/src/config/desktop.js` și `concediuBackend/src/server.js`.

Ca să publici o versiune nouă pe GitHub, cu [GitHub CLI](https://cli.github.com):

```powershell
Compress-Archive -Path release\windows\* -DestinationPath release\Concediu-APP-windows.zip -Force
gh release create v1.1.0 release\Concediu-APP-windows.zip --title "Concediu APP 1.1.0" --notes "Ce s-a schimbat..."
```
