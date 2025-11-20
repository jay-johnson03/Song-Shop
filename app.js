import axios from "axios";
import { db } from "./db.js";
import { getSpotifyToken } from "./spotify.js";

async function searchAndStoreTrack(query) {
  const token = await getSpotifyToken();

  const result = await axios.get(
    "https://api.spotify.com/v1/search",
    {
      params: { q: query, type: "track", limit: 1 },
      headers: { Authorization: "Bearer " + token }
    }
  );

  const track = result.data.tracks.items[0];

  db.query(
    "INSERT INTO tracks (id, name, artist) VALUES (?, ?, ?)",
    [track.id, track.name, track.artists[0].name],
    (err) => {
      if (err) throw err;
      console.log("Track stored:", track.name);
    }
  );
}

searchAndStoreTrack("blinding lights");
