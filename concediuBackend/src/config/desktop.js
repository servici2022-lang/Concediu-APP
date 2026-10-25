const fs = require('fs');
const crypto = require('crypto');

/**
 * Varianta Windows (Concediu-APP.exe) își ține setările în config.env, lângă executabil.
 * Fișierul se creează la prima pornire, iar secretele JWT se generează automat,
 * ca utilizatorul să aibă de configurat doar conexiunea la baza de date.
 */

const newSecret = () => crypto.randomBytes(48).toString('hex');

const EOL = process.platform === 'win32' ? '\r\n' : '\n';

/** Conținutul config.env. Fără `secrets`, secretele rămân goale și se completează la pornire. */
const configTemplate = ({ secrets = true } = {}) =>
  `# Concediu APP - fișier de configurare
#
# După ce modifici o valoare, închide și pornește din nou Concediu-APP.exe.
# Liniile care încep cu # sunt comentarii.

# --- Baza de date (MongoDB) ---------------------------------------------------
# MongoDB instalat pe acest calculator:
MONGO_URI=mongodb://localhost:27017/concediu
#
# Alte exemple (pune # în fața liniei de mai sus și scoate-l de la cea folosită):
#   MongoDB pe alt calculator din rețea:
#     MONGO_URI=mongodb://192.168.1.50:27017/concediu
#   MongoDB cu utilizator și parolă:
#     MONGO_URI=mongodb://utilizator:parola@192.168.1.50:27017/concediu?authSource=admin
#   MongoDB Atlas (în cloud):
#     MONGO_URI=mongodb+srv://utilizator:parola@cluster0.xxxxx.mongodb.net/concediu

# --- Aplicația ------------------------------------------------------------------
# Portul aplicației: pe acest calculator se deschide la http://localhost:3000,
# iar colegii din rețea intră la http://<IP-ul acestui calculator>:3000
PORT=3000
# Deschide automat browserul la pornire (true sau false)
OPEN_BROWSER=true

# --- Administratorul creat la prima pornire, când baza de date e goală ---------
# Schimbă parola din aplicație după prima autentificare (Profil).
ADMIN_EMAIL=admin@concediu.ro
ADMIN_PASSWORD=Admin123!

# --- Securitate: generate automat, nu le modifica -------------------------------
# Dacă le schimbi, toți utilizatorii trebuie să se autentifice din nou.
JWT_SECRET=${secrets ? newSecret() : ''}
JWT_REFRESH_SECRET=${secrets ? newSecret() : ''}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

NODE_ENV=production
`.replace(/\n/g, EOL);

/**
 * Creează config.env dacă lipsește și completează secretele JWT goale sau lipsă.
 * Nu modifică nimic altceva din fișier.
 */
const prepareDesktopConfig = (file) => {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, configTemplate(), 'utf8');
      console.log(`Am creat fișierul de configurare: ${file}`);
      return;
    }

    let text = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
      const emptyLine = new RegExp(`^${key}=[ \\t]*(\\r?)$`, 'm');
      if (emptyLine.test(text)) {
        text = text.replace(emptyLine, (_line, cr) => `${key}=${newSecret()}${cr}`);
        changed = true;
      } else if (!new RegExp(`^${key}=`, 'm').test(text)) {
        text += `${EOL}${key}=${newSecret()}${EOL}`;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, text, 'utf8');
      console.log(`Am generat secretele de securitate în ${file}`);
    }
  } catch (error) {
    console.error(
      `Nu pot scrie fișierul de configurare ${file}: ${error.message}\n` +
        'Mută folderul aplicației într-un loc unde ai drept de scriere (ex. C:\\ConcediuAPP sau Desktop).'
    );
  }
};

module.exports = { prepareDesktopConfig, configTemplate };
