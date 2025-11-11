import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.static("public")); // serves everything in /public

// 👇 ADD THIS ROUTE so "/" loads index.html
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = "https://localhost:3000";

app.get("/login", (req, res) => {
  const scope = "user-read-private user-read-email";
  const auth_url = new URL("https://accounts.spotify.com/authorize");
  auth_url.search = new URLSearchParams({
    response_type: "code",
    client_id,
    scope,
    redirect_uri,
  });
  res.redirect(auth_url.toString());
});

app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
    }),
  });

  const tokenData = await tokenResponse.json();
  const access_token = tokenData.access_token;

  res.redirect(`/index.html?access_token=${access_token}`);
});

// Start HTTPS server
import https from "https";
import fs from "fs";
import path from "path";

// Serve media (images) from the original static folder so we don't need to copy binaries
app.use('/media', express.static(path.join(process.cwd(), 'src', 'main', 'resources', 'static', 'media')));

const options = {
  key: fs.readFileSync("./localhost-key.pem"),
  cert: fs.readFileSync("./localhost.pem"),
};

https.createServer(options, app).listen(3000, () => {
  console.log("Secure server at https://localhost:3000");
});

const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');

const PORT = process.env.PORT || 3000;

// paths to certs generated above (place certs in project root)
const CERT_FILE = path.join(__dirname, 'localhost.pem');
const KEY_FILE  = path.join(__dirname, 'localhost-key.pem');

// serve static site from public/
app.use(express.static(path.join(__dirname, 'public')));

// optional: ensure root serves index.html (use index.html or indexx.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start HTTPS server (requires cert + key files present)
if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
  const options = {
    cert: fs.readFileSync(CERT_FILE),
    key: fs.readFileSync(KEY_FILE),
    };
  https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS server running at https://localhost:${PORT}`);
  });
} else {
  // fallback to HTTP if certs missing (useful while generating)
  app.listen(PORT, () => {
    console.log(`HTTP server running at http://localhost:${PORT} (no certs found)`);
  });
}
