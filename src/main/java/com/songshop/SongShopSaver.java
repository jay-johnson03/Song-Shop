package src.main.java.com.songshop;
import src.main.java.com.songshop.api.SpotifyApi;
import java.sql.*;

public class SongShopSaver {
    public static void main(String[] args) {
        System.out.println("🎵 Starting SongShop...");

        // Step 1: Connect to the database
        String url = "jdbc:mysql://localhost:3306/SongShop";
        String user = "root";         // <-- change if needed
        String password = "yourPassword"; // <-- change if needed

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("✅ Connected to MySQL database!");

            // Step 2: Use Spotify API
            SpotifyApi spotifyApi = new SpotifyApi();
            spotifyApi.fetchAndSaveGenreSongs(conn, "pop");

        } catch (SQLException e) {
            System.out.println("❌ Database connection failed!");
            e.printStackTrace();
        }
    }
}
