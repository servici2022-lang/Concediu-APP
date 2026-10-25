/**
 * Construiește varianta Windows a aplicației: interfața compilată și serverul,
 * împachetate cu Node.js într-un singur Concediu-APP.exe.
 *
 * Rulare (din concediuBackend):  npm run build:exe
 * Rezultat:                      ../release/windows/  (Concediu-APP.exe, config.env, CITESTE-MA.txt)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { configTemplate } = require('../src/config/desktop');

const backendDir = path.resolve(__dirname, '..');
const appDir = path.resolve(backendDir, '..', 'concediuApp');
const publicDir = path.join(backendDir, 'public');
const outDir = path.resolve(backendDir, '..', 'release', 'windows');
const exePath = path.join(outDir, 'Concediu-APP.exe');
// Versiunea de Node.js inclusă în exe
const target = process.env.PKG_TARGET || 'node24-win-x64';

const run = (command, cwd) => {
  console.log(`\n> ${command}   [${path.relative(path.resolve(backendDir, '..'), cwd) || '.'}]`);
  execSync(command, { cwd, stdio: 'inherit' });
};

// 1. Interfața, build de producție (apelează API-ul la /api, pe aceeași adresă)
if (!fs.existsSync(path.join(appDir, 'node_modules'))) run('npm ci', appDir);
run('npm run build', appDir);

// 2. Interfața compilată se copiază în public/, de unde o servește serverul
fs.rmSync(publicDir, { recursive: true, force: true });
fs.cpSync(path.join(appDir, 'dist', 'concediuApp', 'browser'), publicDir, { recursive: true });

// 3. Serverul + interfața + Node.js într-un singur exe
fs.mkdirSync(outDir, { recursive: true });
run(
  `npx pkg . --targets ${target} --output "${exePath}" --no-bytecode --public-packages "*" --public`,
  backendDir
);

// 4. Fișierul de configurare (secretele se generează la prima pornire) și instrucțiunile
fs.writeFileSync(path.join(outDir, 'config.env'), configTemplate({ secrets: false }), 'utf8');
fs.copyFileSync(path.join(__dirname, 'CITESTE-MA.txt'), path.join(outDir, 'CITESTE-MA.txt'));

const sizeMb = (fs.statSync(exePath).size / 1024 / 1024).toFixed(0);
console.log(`\nGata: ${exePath} (${sizeMb} MB)`);
console.log('Copiază tot folderul release/windows pe calculatorul unde rulează aplicația.');
