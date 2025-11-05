package com.songshop.api;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class SpotifyApi {
    public void fetchAndSaveGenreSongs(Connection conn, String genre) {
        System.out.println("🎧 Fetching songs for genre: " + genre);

        String token;
        try {
            token = SpotifyAuth.getAccessToken();
        } catch (IOException e) {
            System.out.println("❌ Could not obtain Spotify token: " + e.getMessage());
            return;
        }

        try {
            String q = URLEncoder.encode(genre, StandardCharsets.UTF_8);
            String url = "https://api.spotify.com/v1/search?q=" + q + "&type=track&limit=10";

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = client.send(request, BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                System.out.println("❌ Spotify API returned status " + resp.statusCode() + ": " + resp.body());
                return;
            }

            JsonObject root = JsonParser.parseString(resp.body()).getAsJsonObject();
            JsonObject tracks = root.has("tracks") ? root.getAsJsonObject("tracks") : null;
            if (tracks == null) {
                System.out.println("❌ No tracks field in Spotify response.");
                return;
            }

            JsonArray items = tracks.getAsJsonArray("items");
            if (items == null || items.size() == 0) {
                System.out.println("⚠️ No tracks found for genre: " + genre);
                return;
            }

            PreparedStatement stmt = conn.prepareStatement(
                    "INSERT INTO Song (songId, songTitle, artistId, genreId) VALUES (?, ?, ?, ?)"
            );

            int inserted = 0;
            for (int i = 0; i < items.size(); i++) {
                JsonObject item = items.get(i).getAsJsonObject();
                String songId = item.has("id") ? item.get("id").getAsString() : null;
                String songTitle = item.has("name") ? item.get("name").getAsString() : "";

                // We don't have numeric artistId/genreId mapping in the DB schema here,
                // so insert 0 as placeholder. Adjust if you have artist/genre tables.
                int artistId = 0;
                int genreId = 0;

                try {
                    stmt.setString(1, songId);
                    stmt.setString(2, songTitle);
                    stmt.setInt(3, artistId);
                    stmt.setInt(4, genreId);
                    stmt.executeUpdate();
                    inserted++;
                } catch (SQLException e) {
                    // If insert fails (e.g. duplicate key), continue with next
                    System.out.println("⚠️ Failed to insert " + songTitle + ": " + e.getMessage());
                }
            }

            System.out.println("✅ Inserted " + inserted + " songs for genre: " + genre);

        } catch (Exception e) {
            System.out.println("❌ Error while fetching/saving songs: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
