package com.songshop.api;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

@RestController
@RequestMapping("/api/spotify")
public class SpotifyController {

    @GetMapping("/token")
    public String token() {
        try {
            return SpotifyAuth.getAccessToken();
        } catch (IOException e) {
            e.printStackTrace();
            return "";
        }
    }

    // Initiate Spotify Authorization Code flow. Stores a state in session and redirects to Spotify.
    @GetMapping("/login")
    public ResponseEntity<Void> login(HttpSession session) {
        String clientId = SpotifyAuth.getEnvOrConstant("SPOTIFY_CLIENT_ID", SpotifyAuth.SPOTIFY_CLIENT_ID);
        String redirectUri = SpotifyAuth.getEnvOrConstant("SPOTIFY_REDIRECT_URI", "http://localhost:8080/api/spotify/callback");
        String scope = "user-read-private user-read-email";
        String state = UUID.randomUUID().toString();
        session.setAttribute("spotify_oauth_state", state);

        String authorizeUrl = SpotifyAuth.buildAuthorizeUrl(clientId, redirectUri, state, scope);
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(authorizeUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    // Callback endpoint Spotify will redirect to with code and state
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state,
                                         HttpSession session) {
        Object expected = session.getAttribute("spotify_oauth_state");
        if (expected == null || state == null || !state.equals(expected.toString())) {
            // state mismatch
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(URI.create("/"));
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
        }

        String clientId = SpotifyAuth.getEnvOrConstant("SPOTIFY_CLIENT_ID", SpotifyAuth.SPOTIFY_CLIENT_ID);
        String clientSecret = SpotifyAuth.getEnvOrConstant("SPOTIFY_CLIENT_SECRET", SpotifyAuth.SPOTIFY_CLIENT_SECRET);
        String redirectUri = SpotifyAuth.getEnvOrConstant("SPOTIFY_REDIRECT_URI", "http://localhost:8080/api/spotify/callback");

        try {
            String accessToken = SpotifyAuth.exchangeCodeForAccessToken(clientId, clientSecret, code, redirectUri);
            // store token in session for subsequent API calls from this browser session
            session.setAttribute("spotify_access_token", accessToken);
        } catch (IOException e) {
            e.printStackTrace();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create("/"));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    // Return the Spotify profile for the logged-in user (via session-stored token)
    @GetMapping("/me")
    public ResponseEntity<String> me(HttpSession session) {
        Object tok = session.getAttribute("spotify_access_token");
        if (tok == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("");
        }
        String token = tok.toString();
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/me"))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
            return ResponseEntity.status(resp.statusCode()).body(resp.body());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("");
        }
    }
}
