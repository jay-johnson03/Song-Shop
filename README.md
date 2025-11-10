# Song-Shop (Static + Node)

This repository has been converted from a Spring Boot backend to a static frontend served by a small Node.js server.

What remains in this project:
- `src/main/resources/static/` — all HTML/CSS/JS assets (frontend).
- `server.js` — minimal Node/Express static server (project root).
- `package.json` — Node dependencies and start script.

Quick start (using WSL/Ubuntu recommended):

1. Ensure WSL/Ubuntu is running and Node.js is installed inside WSL (Node >= 18).

2. From WSL, change to the project directory (example):

```bash
cd /mnt/c/Users/jajoh/OneDrive/Documents/Database\ Design\ and\ Mngmt/Song-Shop
```

3. Install dependencies and start the server:

```bash
npm install
npm start
```

4. Open the site in your browser:

```
http://localhost:8080/
```

Spotify setup notes:
- Register an app on the Spotify Developer Dashboard and add an HTTPS redirect URI that points to your public/secure callback (for local dev you can use a tunnel service such as localtunnel or ngrok). Example: `https://<your-tunnel>.loca.lt/callback.html`
- Put your Spotify Client ID into `src/main/resources/static/spotify-auth.js` (the `config.clientId` value).

If you want to re-add a Java backend later, the original Spring Boot sources were removed to simplify the repository to a client-side + Node setup.
