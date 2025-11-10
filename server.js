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
const redirect_uri = "https://localhost:3000/callback";

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

