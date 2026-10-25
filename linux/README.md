# Concediu APP pe Linux (server)

Pe Linux, aplicația rulează ca un server web:

```
browser ──► nginx :80/:443 ──┬── /        interfața (fișiere statice din /var/www/concediuApp)
                             └── /api/    serverul Node.js (serviciu systemd, 127.0.0.1:3000) ──► MongoDB (127.0.0.1:27017)
```

Ghidul e scris pentru **Ubuntu 22.04/24.04** sau **Debian 12**, cu aplicația și MongoDB pe același server.

> Pentru varianta Windows (un singur `.exe`) vezi [`../windows/README.md`](../windows/README.md). Pentru folosirea aplicației (cereri, aprobări, sold) vezi [README-ul principal](../README.md#ghid-de-utilizare).

Fișierele din acest folder:

| Fișier | Rol |
|---|---|
| [`nginx.conf`](nginx.conf) | Configurația nginx: interfața + proxy pentru `/api/` |
| [`concediu.service`](concediu.service) | Serviciul systemd pentru server |

---

## Cuprins

1. [Pachete necesare](#1-pachete-necesare)
2. [MongoDB](#2-mongodb)
3. [Descărcarea aplicației](#3-descărcarea-aplicației)
4. [Serverul (backend)](#4-serverul-backend)
5. [Serviciul systemd](#5-serviciul-systemd)
6. [Interfața (frontend)](#6-interfața-frontend)
7. [nginx](#7-nginx)
8. [Firewall și HTTPS](#8-firewall-și-https)
9. [Actualizare](#9-actualizare)
10. [Backup](#10-backup)
11. [Probleme frecvente](#11-probleme-frecvente)

---

## 1. Pachete necesare

```bash
sudo apt update
sudo apt install -y git curl nginx

# Node.js 24 LTS (de la NodeSource)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node --version      # trebuie să fie v22 sau v24
```

## 2. MongoDB

Aplicația merge cu **MongoDB 7 sau mai nou** (testată cu 7.0 și 9.0). Recomandat e pachetul oficial (2.1). Docker (2.5) e o alternativă.

### 2.1 Instalare (pachetul oficial `mongodb-org`)

**Ubuntu 24.04:**

```bash
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

- **Ubuntu 22.04:** înlocuiește `noble` cu `jammy`.
- **Debian 12:** linia `echo` devine:
  ```bash
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
  ```
- **Altă versiune:** exemplul instalează MongoDB 8.0. Pentru o versiune mai nouă, înlocuiește `8.0` peste tot și verifică [ghidul oficial](https://www.mongodb.com/docs/manual/administration/install-on-linux/).

**Verificare:**

```bash
systemctl status mongod                               # active (running)
mongosh --quiet --eval "db.runCommand({ ping: 1 })"   # { ok: 1 }
```

| Ce | Unde |
|---|---|
| Configurarea MongoDB | `/etc/mongod.conf` |
| Datele | `/var/lib/mongodb` |
| Jurnalul (pentru erori) | `/var/log/mongodb/mongod.log` |

### 2.2 Configurare implicită (aplicația pe același server)

MongoDB ascultă implicit doar local (`bindIp: 127.0.0.1` în `/etc/mongod.conf`), deci nu e accesibil din rețea. Fără parolă, conexiunea din `.env` (pasul 4) este:

```ini
MONGO_URI=mongodb://127.0.0.1:27017/concediu
```

Baza de date `concediu` se creează singură la `npm run seed`.

### 2.3 Utilizator și parolă (recomandat)

Fără parolă, orice proces de pe server poate citi și modifica datele. **Dacă MongoDB e accesibil din rețea (2.4), parola e obligatorie.**

**1. Creează utilizatorii.** Deschide consola cu `mongosh`, apoi scrie pe rând:

```js
use admin
db.createUser({ user: "admin", pwd: passwordPrompt(), roles: ["root"] })

use concediu
db.createUser({ user: "concediu", pwd: passwordPrompt(), roles: [{ role: "readWrite", db: "concediu" }] })

exit
```

- `passwordPrompt()` îți cere parola fără s-o afișeze.
- `admin` e administratorul MongoDB, pentru întreținere și backup.
- `concediu` e utilizatorul aplicației și are drepturi doar pe baza `concediu`.
- Folosește parole din litere și cifre: caracterele `@ : / ? # %` trebuie codificate în `MONGO_URI`.

O parolă potrivită se generează cu `openssl rand -hex 16`.

**2. Pornește verificarea parolei** cu `sudo nano /etc/mongod.conf`. Înlocuiește linia `#security:` cu:

```yaml
security:
  authorization: enabled
```

`authorization` are în față exact **2 spații**, nu tab.

**3. Repornește MongoDB și testează:**

```bash
sudo systemctl restart mongod
mongosh "mongodb://concediu:PAROLA@127.0.0.1:27017/concediu" --quiet --eval "db.runCommand({ ping: 1 })"
```

**4. Pune utilizatorul în `.env`** (pasul 4):

```ini
MONGO_URI=mongodb://concediu:PAROLA@127.0.0.1:27017/concediu
```

### 2.4 MongoDB pe alt server (acces din rețea)

Pașii se fac **pe serverul cu MongoDB**, după [2.3](#23-utilizator-și-parolă-recomandat). Nu deschide niciodată MongoDB spre rețea fără parolă. În exemplu, serverul cu MongoDB are IP-ul `192.168.1.50`, iar cel cu aplicația `192.168.1.20`.

**1. Ascultă și pe IP-ul din rețea.** În `/etc/mongod.conf`, secțiunea `net` devine:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1,192.168.1.50
```

**2. Repornește MongoDB și permite în firewall doar serverul aplicației:**

```bash
sudo systemctl restart mongod
sudo ufw allow from 192.168.1.20 to any port 27017 proto tcp
```

**Pe serverul aplicației**, în `.env`:

```ini
MONGO_URI=mongodb://concediu:PAROLA@192.168.1.50:27017/concediu
```

### 2.5 Alternativă: MongoDB în Docker

Instalează Docker după [ghidul oficial](https://docs.docker.com/engine/install/). Pornirea MongoDB se face după [pasul 3](#3-descărcarea-aplicației), când proiectul e descărcat:

```bash
cd /opt/Concediu-APP/concediuBackend
# Pune MongoDB doar pe localhost: linia de port devine "127.0.0.1:27017:27017"
sudo sed -i 's/- "27017:27017"/- "127.0.0.1:27017:27017"/' docker-compose.yml
sudo docker compose up -d
```

Conexiunea e aceeași ca la [2.2](#22-configurare-implicită-aplicația-pe-același-server): `MONGO_URI=mongodb://127.0.0.1:27017/concediu`.

Pentru parolă în Docker, adaugă în `docker-compose.yml`, sub `mongodb:`, **înainte de prima pornire** (volumul trebuie să fie gol):

```yaml
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: PAROLA
```

Conexiunea devine:

```ini
MONGO_URI=mongodb://admin:PAROLA@127.0.0.1:27017/concediu?authSource=admin
```

## 3. Descărcarea aplicației

```bash
sudo git clone https://github.com/servici2022-lang/Concediu-APP.git /opt/Concediu-APP
```

## 4. Serverul (backend)

```bash
cd /opt/Concediu-APP/concediuBackend
sudo npm ci --omit=dev
sudo cp .env.example .env
```

Generează două secrete diferite:

```bash
openssl rand -hex 48
openssl rand -hex 48
```

Editează `.env` cu `sudo nano .env`:

```ini
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/concediu
JWT_SECRET=<primul secret>
JWT_REFRESH_SECRET=<al doilea secret>
ADMIN_EMAIL=admin@firma-ta.ro
ADMIN_PASSWORD=<o parolă inițială>
```

Dacă ai pus parolă la MongoDB ([2.3](#23-utilizator-și-parolă-recomandat)), folosește `MONGO_URI=mongodb://concediu:PAROLA@127.0.0.1:27017/concediu`.

**Serverul nu pornește** dacă secretele lipsesc, sunt cele din exemplu, au sub 32 de caractere sau sunt identice.

`.env` conține secrete, deci trebuie să-l poată citi doar serviciul:

```bash
sudo chown root:www-data .env
sudo chmod 640 .env
```

Creează contul de administrator, tipurile de concediu și sărbătorile legale:

```bash
sudo npm run seed
```

## 5. Serviciul systemd

Serviciul pornește serverul la boot și îl repornește dacă se oprește.

```bash
sudo cp /opt/Concediu-APP/linux/concediu.service /etc/systemd/system/concediu.service
sudo systemctl daemon-reload
sudo systemctl enable --now concediu
sudo systemctl status concediu        # trebuie să apară "active (running)"
curl -s http://127.0.0.1:3000/api/health
```

Jurnalul serverului: `sudo journalctl -u concediu -f`.

Dacă ai pus proiectul în alt folder decât `/opt/Concediu-APP`, modifică `WorkingDirectory` în `/etc/systemd/system/concediu.service`.

## 6. Interfața (frontend)

```bash
cd /opt/Concediu-APP/concediuApp
sudo npm ci
sudo npm run build
sudo mkdir -p /var/www/concediuApp
sudo cp -r dist/concediuApp/browser/* /var/www/concediuApp/
```

Build-ul de producție apelează serverul la `/api`, pe aceeași adresă, prin nginx.

## 7. nginx

```bash
sudo cp /opt/Concediu-APP/linux/nginx.conf /etc/nginx/sites-available/concediu
sudo ln -sf /etc/nginx/sites-available/concediu /etc/nginx/sites-enabled/concediu
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Aplicația e disponibilă la **`http://<adresa-serverului>/`**. Te autentifici cu `ADMIN_EMAIL` și `ADMIN_PASSWORD` din `.env`, iar parola o schimbi apoi din **Profil**.

## 8. Firewall și HTTPS

Deschide doar porturile web. Porturile 3000 și 27017 rămân închise.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

**HTTPS (recomandat).** Fără el, parolele circulă necriptat prin rețea. Dacă serverul are un nume de domeniu:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d concediu.firma-ta.ro
```

Pentru un server accesibil doar în rețeaua internă, fără domeniu public, folosește un certificat emis de rețeaua firmei sau unul self-signed.

## 9. Actualizare

```bash
cd /opt/Concediu-APP
sudo git pull

# serverul
cd concediuBackend
sudo npm ci --omit=dev
sudo systemctl restart concediu

# interfața
cd ../concediuApp
sudo npm ci
sudo npm run build
sudo cp -r dist/concediuApp/browser/* /var/www/concediuApp/
```

### Pași în plus la actualizarea din octombrie 2026

Doar dacă actualizezi o instalare făcută înainte de octombrie 2026:

1. **Secretele JWT** (obligatoriu).
   - Serverul refuză acum să pornească dacă secretele din `.env` sunt cele din exemplu (`change-this…`), au sub 32 de caractere sau sunt identice.
   - Generează secrete noi ([pasul 4](#4-serverul-backend)) și repornește serviciul.
   - Toți utilizatorii se vor autentifica din nou.
2. **Sărbătorile noi.** Din `concediuBackend`, rulează `sudo npm run seed`.
   - Se adaugă Boboteaza și Sf. Ioan (6–7 ianuarie, zile libere din 2024), plus Paștele și Rusaliile pentru anul trecut și următorii 5 ani.
   - Contul de admin nu se modifică.
3. **Recalcularea zilelor** cererilor existente care includeau aceste zile:
   ```bash
   sudo npm run recalc:days              # doar afișează ce s-ar schimba
   sudo npm run recalc:days -- --apply   # aplică corecțiile
   ```
4. **Parola adminului.** Dacă e încă `Admin123!`, schimb-o din **Profil**.

Sesiunile se salvează acum criptat, deci fiecare utilizator se autentifică o dată din nou după actualizare.

`npm run seed` adaugă Paștele și Rusaliile pentru următorii 5 ani. Rulează-l din nou o dată pe an, ca anii noi să fie acoperiți.

## 10. Backup

Toate datele sunt în MongoDB. Exemplu de backup zilnic, la ora 02:00, cu păstrarea ultimelor 30 de zile:

```bash
sudo mkdir -p /var/backups/concediu
sudo crontab -e
```

```cron
0 2 * * * mongodump --uri "mongodb://127.0.0.1:27017/concediu" --out /var/backups/concediu/$(date +\%F) && find /var/backups/concediu -maxdepth 1 -mtime +30 -exec rm -rf {} +
```

Restaurare:

```bash
mongorestore --uri "mongodb://127.0.0.1:27017/concediu" --drop /var/backups/concediu/2026-10-25/concediu
```

Dacă MongoDB are parolă ([2.3](#23-utilizator-și-parolă-recomandat)), folosește în comenzi utilizatorul `admin`: `--uri "mongodb://admin:PAROLA@127.0.0.1:27017/concediu?authSource=admin"`.

`mongodump` și `mongorestore` vin cu pachetul `mongodb-database-tools`, din [repository-ul MongoDB](https://www.mongodb.com/docs/database-tools/installation/installation-linux/). Comenzile merg la fel și cu varianta Docker, pentru că MongoDB ascultă tot pe `127.0.0.1:27017`.

Păstrează și o copie a fișierului `concediuBackend/.env`.

## 11. Probleme frecvente

| Mesaj sau simptom | Cauza și soluția |
|---|---|
| `systemctl status concediu` arată `failed` | Vezi cauza cu `sudo journalctl -u concediu -n 50`. |
| În jurnal: `Insecure JWT configuration in .env` | Secretele JWT lipsesc sau sunt slabe. Vezi [pasul 4](#4-serverul-backend). |
| În jurnal: `MongoDB connection error ... ECONNREFUSED` | MongoDB nu rulează (`systemctl status mongod` sau `docker ps`) sau adresa din `MONGO_URI` e greșită. |
| În jurnal: `MongoDB connection error ... Authentication failed` | Utilizator sau parolă greșite în `MONGO_URI`. Utilizatorul `concediu` de la [2.3](#23-utilizator-și-parolă-recomandat) e creat în baza `concediu`. Pentru unul creat în `admin`, adaugă `?authSource=admin`. |
| În jurnal: `MongoDB requires a user with access to database "concediu"`, `requires authentication` sau `not authorized on concediu` | MongoDB cere parolă, dar `MONGO_URI` nu are utilizator și parolă, sau utilizatorul nu are drepturi pe baza `concediu`. Vezi [2.3](#23-utilizator-și-parolă-recomandat). |
| `mongod` nu mai pornește după ce ai modificat `/etc/mongod.conf` | Greșeală de indentare: doar spații, câte 2. Cauza exactă: `sudo tail -n 30 /var/log/mongodb/mongod.log`. |
| În jurnal: `EACCES` la citirea `.env` | Permisiunile lui `.env`. Vezi comenzile `chown`/`chmod` de la pasul 4. |
| Ai uitat parola de admin | Aplicația nu are încă resetare de parolă. Creezi un administrator nou, fără să pierzi date: în `.env` pui un `ADMIN_EMAIL` nou (care nu există încă în aplicație) și un `ADMIN_PASSWORD`, apoi rulezi `sudo npm run seed` în `concediuBackend`. Te autentifici cu noul cont și dezactivezi contul vechi din **Utilizatori**. |
| În browser: **502 Bad Gateway** | nginx merge, dar serverul Node.js nu. Verifică `systemctl status concediu`. |
| În browser: **404** la reîncărcarea unei pagini (ex. `/leaves`) | Lipsește `try_files ... /index.html` din configurația nginx. Folosește `linux/nginx.conf`. |
| Interfața se încarcă, dar login-ul dă eroare de rețea | Interfața a fost construită fără `npm run build`, adică nu în modul producție, și apelează portul 3000. Refă pasul 6. |
