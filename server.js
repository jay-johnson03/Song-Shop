const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const STATIC_DIR = path.join(__dirname, 'src', 'main', 'resources', 'static');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

// Serve static files from the static directory
app.use(express.static(STATIC_DIR));

// For client-side routing, serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving files from ${STATIC_DIR}`);
});