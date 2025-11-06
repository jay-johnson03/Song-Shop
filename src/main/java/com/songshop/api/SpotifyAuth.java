package com.songshop.api;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SpotifyAuth {
    private static final String TOKEN_URL = "https://accounts.spotify.com/api/token";
    private static final String AUTHORIZE_URL = "https://accounts.spotify.com/authorize";

    // Default placeholders so code runs even if env vars are not configured.
    public static final String SPOTIFY_CLIENT_ID = "SPOTIFY_CLIENT_ID";
    public static final String SPOTIFY_CLIENT_SECRET = "SPOTIFY_CLIENT_SECRET";

    // Resolve credentials from environment variables or fall back to constants.
    public static String getEnvOrConstant(String envKey, String constant) {
        String val = System.getenv(envKey);
        return (val != null && !val.isEmpty()) ? val : constant;
    }

    public static String getAccessToken() throws IOException {
        String clientId = getEnvOrConstant("SPOTIFY_CLIENT_ID", SPOTIFY_CLIENT_ID);
        String clientSecret = getEnvOrConstant("SPOTIFY_CLIENT_SECRET", SPOTIFY_CLIENT_SECRET);
        return getAccessToken(clientId, clientSecret);
    }

    // Request an access token from Spotify using client_credentials (server-to-server)
    public static String getAccessToken(String clientId, String clientSecret) throws IOException {
        if (clientId == null || clientId.isEmpty()) {
            throw new IllegalStateException("Spotify client id is not set. Provide SPOTIFY_CLIENT_ID env var or set CLIENT_ID in the code.");
        }
        if (clientSecret == null || clientSecret.isEmpty()) {
            throw new IllegalStateException("Spotify client secret is not set. Provide SPOTIFY_CLIENT_SECRET env var or set CLIENT_SECRET in the code.");
        }

        String creds = clientId + ":" + clientSecret;
        String authHeader = "Basic " + Base64.getEncoder().encodeToString(creds.getBytes(StandardCharsets.UTF_8));

        HttpClient client = HttpClient.newHttpClient();
        String form = "grant_type=client_credentials";
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(TOKEN_URL))
                .header("Authorization", authHeader)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(BodyPublishers.ofString(form))
                .build();

        try {
            HttpResponse<String> resp = client.send(request, BodyHandlers.ofString());
            int code = resp.statusCode();
            String body = resp.body();
            if (code < 200 || code >= 300) {
                throw new IOException("Failed to fetch token: status=" + code + ", body=" + body);
            }

            Pattern p = Pattern.compile("\"access_token\"\s*:\s*\"([^\"]+)\"");
            Matcher m = p.matcher(body);
            if (m.find()) {
                return m.group(1);
            }
            throw new IOException("access_token not found in response: " + body);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Request interrupted", e);
        }
    }

    // Build the Spotify authorization URL for Authorization Code flow
    public static String buildAuthorizeUrl(String clientId, String redirectUri, String state, String scope) {
        try {
            StringBuilder sb = new StringBuilder(AUTHORIZE_URL)
                    .append("?response_type=code")
                    .append("&client_id=").append(URLEncoder.encode(clientId, StandardCharsets.UTF_8))
                    .append("&redirect_uri=").append(URLEncoder.encode(redirectUri, StandardCharsets.UTF_8));

            if (scope != null && !scope.isEmpty()) {
                sb.append("&scope=").append(URLEncoder.encode(scope, StandardCharsets.UTF_8));
            }
            if (state != null && !state.isEmpty()) {
                sb.append("&state=").append(URLEncoder.encode(state, StandardCharsets.UTF_8));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build authorize URL", e);
        }
    }

    // Exchange an authorization code for an access token (Authorization Code grant)
    public static String exchangeCodeForAccessToken(String clientId, String clientSecret, String code, String redirectUri) throws IOException {
        if (clientId == null || clientId.isEmpty()) {
            throw new IllegalStateException("Spotify client id is not set.");
        }
        if (clientSecret == null || clientSecret.isEmpty()) {
            throw new IllegalStateException("Spotify client secret is not set.");
        }

        String creds = clientId + ":" + clientSecret;
        String authHeader = "Basic " + Base64.getEncoder().encodeToString(creds.getBytes(StandardCharsets.UTF_8));

        HttpClient client = HttpClient.newHttpClient();
        StringBuilder form = new StringBuilder();
        form.append("grant_type=authorization_code");
        form.append("&code=").append(URLEncoder.encode(code, StandardCharsets.UTF_8));
        form.append("&redirect_uri=").append(URLEncoder.encode(redirectUri, StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(TOKEN_URL))
                .header("Authorization", authHeader)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(BodyPublishers.ofString(form.toString()))
                .build();

        try {
            HttpResponse<String> resp = client.send(request, BodyHandlers.ofString());
            int codeStatus = resp.statusCode();
            String body = resp.body();
            if (codeStatus < 200 || codeStatus >= 300) {
                throw new IOException("Failed to exchange code: status=" + codeStatus + ", body=" + body);
            }

            Pattern p = Pattern.compile("\"access_token\"\s*:\s*\"([^\"]+)\"");
            Matcher m = p.matcher(body);
            if (m.find()) {
                return m.group(1);
            }
            throw new IOException("access_token not found in exchange response: " + body);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Request interrupted", e);
        }
    }

    // Small main for local smoke-checks. Does not run network call unless credentials are set.
    public static void main(String[] args) throws Exception {
        System.out.println("SpotifyAuth compiled successfully.");
    }
}
