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

**Varianta A: Docker** (cea mai simplă). Instalează Docker după [ghidul oficial](https://docs.docker.com/engine/install/). Pornirea MongoDB se face după pasul 3, când proiectul e descărcat:

```bash
cd /opt/Concediu-APP/concediuBackend
# Pune MongoDB doar pe localhost: în docker-compose.yml, linia de port devine "127.0.0.1:27017:27017"
sudo sed -i 's/- "27017:27017"/- "127.0.0.1:27017:27017"/' docker-compose.yml
sudo docker compose up -d
```

**Varianta B: pachetul oficial `mongodb-org`.** Urmează [ghidul MongoDB pentru Ubuntu](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/) sau [pentru Debian](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-debian/), apoi:

```bash
sudo systemctl enable --now mongod
```

În ambele variante, MongoDB ascultă doar local (`127.0.0.1`), deci nu e accesibil din rețea. Așa trebuie să rămână: nu are parolă.

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

`mongodump` și `mongorestore` vin cu pachetul `mongodb-database-tools`, din [repository-ul MongoDB](https://www.mongodb.com/docs/database-tools/installation/installation-linux/). Comenzile merg la fel și cu varianta Docker, pentru că MongoDB ascultă tot pe `127.0.0.1:27017`.

Păstrează și o copie a fișierului `concediuBackend/.env`.

## 11. Probleme frecvente

| Mesaj sau simptom | Cauza și soluția |
|---|---|
| `systemctl status concediu` arată `failed` | Vezi cauza cu `sudo journalctl -u concediu -n 50`. |
| În jurnal: `Insecure JWT configuration in .env` | Secretele JWT lipsesc sau sunt slabe. Vezi [pasul 4](#4-serverul-backend). |
| În jurnal: `MongoDB connection error` | MongoDB nu rulează (`systemctl status mongod` sau `docker ps`) sau `MONGO_URI` e greșit. |
| În jurnal: `EACCES` la citirea `.env` | Permisiunile lui `.env`. Vezi comenzile `chown`/`chmod` de la pasul 4. |
| În browser: **502 Bad Gateway** | nginx merge, dar serverul Node.js nu. Verifică `systemctl status concediu`. |
| În browser: **404** la reîncărcarea unei pagini (ex. `/leaves`) | Lipsește `try_files ... /index.html` din configurația nginx. Folosește `linux/nginx.conf`. |
| Interfața se încarcă, dar login-ul dă eroare de rețea | Interfața a fost construită fără `npm run build`, adică nu în modul producție, și apelează portul 3000. Refă pasul 6. |
