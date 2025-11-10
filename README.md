# Song-Shop (Static + Node)

A shop where you can find different genres of songs for mood and vibes. Just log in and find what you want best! It's all free and when you click a song, it'll show a link to the song and you can go directly to it for listening.
```

4. Open the site in your browser:

```
[http://localhost:8080/](https://localhost:3000/callback)
```

Spotify setup notes:
- Register an app on the Spotify Developer Dashboard and add an HTTPS redirect URI that points to your public/secure callback (for local dev you can use a tunnel service such as localtunnel or ngrok). Example: `https://<your-tunnel>.loca.lt/callback.html`
- Put your Spotify Client ID into `src/main/resources/static/spotify-auth.js` (the `config.clientId` value).

If you want to re-add a Java backend later, the original Spring Boot sources were removed to simplify the repository to a client-side + Node setup.
