package com.songshop.api;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class SpotifyApi {
    public void fetchAndSaveGenreSongs(Connection conn, String genre) {
        System.out.println("🎧 Fetching songs for genre: " + genre);

        // TODO: call Spotify API here (you can use HttpClient)
        // For now, let's pretend we got this song from Spotify
        String songId = "12345";
        String songTitle = "Fake Spotify Song";
        int artistId = 1;
        int genreId = 1;

        try {
            PreparedStatement stmt = conn.prepareStatement(
                "INSERT INTO Song (songId, songTitle, artistId, genreId) VALUES (?, ?, ?, ?)"
            );
            stmt.setString(1, songId);
            stmt.setString(2, songTitle);
            stmt.setInt(3, artistId);
            stmt.setInt(4, genreId);
            stmt.executeUpdate();

            System.out.println("✅ Inserted song: " + songTitle);
        } catch (SQLException e) {
            System.out.println("❌ Failed to insert song");
            e.printStackTrace();
        }
    }
}
