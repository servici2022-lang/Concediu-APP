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

Aplicația are nevoie de MongoDB 7 sau mai nou. Ai trei variante.

**A. Pe același calculator** (cea mai simplă). Într-un terminal (PowerShell sau Command Prompt):

```powershell
winget install MongoDB.Server
```

MongoDB se instalează ca serviciu Windows, pornește singur odată cu calculatorul și ascultă doar local, pe `localhost:27017`. Nu mai trebuie configurat nimic.

**B. Pe alt calculator sau server din rețea.** Ai nevoie de adresa lui IP și, dacă are autentificare, de un utilizator și o parolă.

**C. MongoDB Atlas, în cloud.** Copiezi șirul de conexiune `mongodb+srv://...` din consola Atlas.

## 3. Configurare: `config.env`

Deschide `config.env` cu Notepad. De obicei trebuie modificat doar `MONGO_URI`:

```ini
# MongoDB pe același calculator (varianta A)
MONGO_URI=mongodb://localhost:27017/concediu

# MongoDB pe alt calculator din rețea (varianta B)
# MONGO_URI=mongodb://192.168.1.50:27017/concediu

# MongoDB cu utilizator și parolă
# MONGO_URI=mongodb://utilizator:parola@192.168.1.50:27017/concediu?authSource=admin

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

Păstrează și o copie a `config.env`.

## 9. Probleme frecvente

| Mesaj sau simptom | Cauza și soluția |
|---|---|
| `MongoDB connection error (...): connect ECONNREFUSED` | MongoDB nu rulează sau adresa e greșită. Verifică serviciul **MongoDB** în `services.msc` și `MONGO_URI` din `config.env`. |
| `MongoDB connection error (...): Authentication failed` | Utilizator sau parolă greșite în `MONGO_URI`. Dacă utilizatorul e creat în baza `admin`, adaugă `?authSource=admin` la final. |
| `Port 3000 is used by another program` | Alt program folosește portul. Pune `PORT=3001` în `config.env` și intră la `http://localhost:3001`. |
| `Nu pot scrie fișierul de configurare` | Folderul nu permite scrierea, de exemplu e în `C:\Program Files`. Mută-l în `C:\ConcediuAPP`. |
| Colegii nu pot intra | Verifică regula din Windows Firewall ([secțiunea 5](#5-acces-din-rețea)) și că folosesc adresa IP afișată în fereastră, cu portul. |
| Fereastra se închide imediat | Deschide un Command Prompt în folderul aplicației și pornește `Concediu-APP.exe` de acolo, ca să vezi mesajul. |
| Ai uitat parola de admin | Alt administrator o poate reseta din **Utilizatori**. Dacă nu există altul, șterge baza de date și repornește aplicația: se creează din nou contul inițial, dar **se pierd datele**. Fă înainte un backup. |

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
