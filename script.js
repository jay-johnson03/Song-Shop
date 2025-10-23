// Fake song data for demo. Each song has a Spotify URL so clicking opens the real Spotify track.
const songsDB = {
  pop: [
    { title: "Levitating", artist: "Dua Lipa", url: "https://open.spotify.com/track/463CkQjx2Zk1yXoBuierM9", img: "" },
    { title: "As It Was", artist: "Harry Styles", url: "https://open.spotify.com/track/4LRPiXqCikLlN15c3yImP7", img: "" }
  ],
  rock: [
    { title: "Bohemian Rhapsody", artist: "Queen", url: "https://open.spotify.com/track/7tFiyTwD0nx5a1eklYtX2J", img: "" },
    { title: "Smells Like Teen Spirit", artist: "Nirvana", url: "https://open.spotify.com/track/5ghIJDpPoe3CfHMGu71E6T", img: "" }
  ],
  hiphop: [
    { title: "SICKO MODE", artist: "Travis Scott", url: "https://open.spotify.com/track/2xLMifQCjDGFmkHkpNLD9h", img: "" },
    { title: "HUMBLE.", artist: "Kendrick Lamar", url: "https://open.spotify.com/track/7KXjTSCq5nL1LoYtL7XAwS", img: "" }
  ],
  rnb: [
    { title: "Ur Best Friend", artist: "Kiana Lede", url: "https://open.spotify.com/track/1gsYCXkisSnnjBb3qwYZoc?si=d73f4f6c1f724865", img: "" },
    { title: "Made for Me", artist: "Muni Long", url: "https://open.spotify.com/track/0WIv5qV41y6YjjB9V1biuC?si=1afbba69f5374d62", img:"" }
  ],
  classical: [
    { title: "Moonlight Sonata", artist: "Ludwig van Beethoven", url: "https://open.spotify.com/track/3T7YQJwHj3fU8T8SbzNqkD", img: "" },
    { title: "Clair de Lune", artist: "Claude Debussy", url: "https://open.spotify.com/track/1CzLJZ6KJzSL0MpwGdDq6w", img: "" }
  ],
  indie: [
    { title: "Pretty Girl", artist: "Clairo", url: "https://open.spotify.com/track/27g0ztD0kKcDJRrIFDl8q8?si=a4759530fdf740af", img:"" },
    { title: "Break My Heart Again", artist: "FINNEAS", url: "https://open.spotify.com/track/7gGBgh0bVxHPgZjA505bo9?si=f8eb28e9d0164f35", img: ""}
  ]
};

/**
 * Call this from each genre page: loadSongs('pop'), loadSongs('rock'), etc.
 */
function loadSongs(genre) {
  const container = document.getElementById('songs');
  if (!container) return;
  container.innerHTML = ''; // clear

  const list = songsDB[genre] || [];
  if (list.length === 0) {
    container.innerHTML = '<p>No songs found for this genre yet.</p>';
    return;
  }

  list.forEach(s => {
    const card = document.createElement('div');
    card.className = 'card';

    // optional image - if provided
    if (s.img) {
      const img = document.createElement('img');
      img.src = s.img;
      img.alt = `${s.title} cover`;
      card.appendChild(img);
    }

    const p = document.createElement('p');
    p.textContent = `${s.title} — ${s.artist}`;
    card.appendChild(p);

    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Open in Spotify';
    card.appendChild(a);

    container.appendChild(card);
  });
}

// Small helper so index.html can show some featured items
function loadFeatured() {
  const container = document.querySelector('.container');
  if (!container) return;
  const html = `
    <h3>Featured Tracks</h3>
    <div class="songs-grid" id="featured"></div>
  `;
  container.insertAdjacentHTML('beforeend', html);
  const featured = document.getElementById('featured');
  const sample = songsDB.pop.concat(songsDB.rock).slice(0,4);
  sample.forEach(s => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<p>${s.title} — ${s.artist}</p><a href="${s.url}" target="_blank" rel="noopener">Open in Spotify</a>`;
    featured.appendChild(div);
  });
}

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0203',
  database: 'songshop',
  port: 3306
});

connection.connect(err => {
  if (err) {
    console.error('Connection error:', err);
    return;
  }
  console.log('Connected to MySQL!');
});
