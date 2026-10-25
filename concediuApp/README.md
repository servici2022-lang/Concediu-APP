# Concediu APP — interfața (frontend)

Interfața web a aplicației Concediu APP (Angular 21 + Nebular). Instalarea, configurarea și ghidul de utilizare sunt în [README-ul principal](../README.md).

```bash
npm install      # instalează dependențele (aplică și patch-ul CDK pentru Nebular)
npm start        # server de dezvoltare pe http://localhost:4200, accesibil și din rețea
npm run build    # build de producție în dist/concediuApp/browser (fișiere statice pentru nginx)
npm test         # teste unitare (Vitest)
```

În dezvoltare, interfața apelează API-ul la `http://<hostname>:3000/api`. Build-ul de producție îl apelează la `/api`, pe aceeași adresă, prin nginx.
