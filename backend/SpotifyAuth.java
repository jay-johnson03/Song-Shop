package backend;
import java.io.IOException;
import java.net.URI;
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
    private static final String SPOTIFY_CLIENT_ID = "SPOTIFY_CLIENT_ID";
    private static final String SPOTIFY_CLIENT_SECRET = "SPOTIFY_CLIENT_SECRET";


    // Resolve credentials from environment variables or fall back to constants.
    public static String getAccessToken() throws IOException {
        String clientId = getEnvOrConstant("SPOTIFY_CLIENT_ID", SPOTIFY_CLIENT_ID);
        String clientSecret = getEnvOrConstant("e50c4265cb464cfba3e58a3bbbf66231", SPOTIFY_CLIENT_SECRET);
        return getAccessToken(clientId, clientSecret);
    }

    // Request an access token from Spotify using only JDK APIs (no external libs).
    public static String getAccessToken(String clientId, String clientSecret) throws IOException {
        if (clientId == null || clientId.isEmpty() || clientId.equals("d520a62aaad34244aa6df66ca71294d3")) {
            throw new IllegalStateException("Spotify client id is not set. Provide SPOTIFY_CLIENT_ID env var or set CLIENT_ID in the code.");
        }
        if (clientSecret == null || clientSecret.isEmpty() || clientSecret.equals("e50c4265cb464cfba3e58a3bbbf66231")) {
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

            // Very small and safe extractor for the access_token field in the JSON response.
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

    private static String getEnvOrConstant(String envKey, String constant) {
        String val = System.getenv(envKey);
        return (val != null && !val.isEmpty()) ? val : constant;
    }

    // Small main for local smoke-checks. Does not run network call unless credentials are set.
    public static void main(String[] args) throws Exception {
        System.out.println("SpotifyAuth compiled successfully.");
    }
}
