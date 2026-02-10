const axios = require('axios');

async function checkPlaylist() {
    try {
        const url = 'http://127.0.0.1:8000/hls/stream.m3u8';
        console.log(`Fetching ${url}...`);
        const res = await axios.get(url);
        console.log("Playlist found!");
        console.log(res.data);
    } catch (e) {
        console.error("Error fetching playlist:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
        }
    }
}

checkPlaylist();
