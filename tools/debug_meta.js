const axios = require('axios');
const cheerio = require('cheerio');

const url = "https://hdhub4u.guide/cars-3-2017-org-hindi-dual-audio-720p-bluray-850mb/";
const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://google.com"
};

async function run() {
    try {
        const res = await axios.get(url, { headers });
        const $ = cheerio.load(res.data);
        
        console.log("Page Title:", $('title').text());
        
        const container = $(".page-body");
        console.log("Container .page-body exists:", container.length > 0);
        
        if (container.length > 0) {
            console.log("H1 inside container:", container.find('h1').length);
            console.log("H1 text:", container.find('h1').text());
            console.log("H2 inside container:", container.find('h2').length);
            container.find('h2').each((i, el) => {
                console.log(`H2 [${i}]:`, $(el).text().trim().substring(0, 50));
                console.log(`H2 [${i}] attrs:`, $(el).attr());
            });
        } else {
             console.log("Body classes:", $('body').attr('class'));
             console.log("H1 in body:", $('h1').text());
        }

    } catch (e) {
        console.error(e);
    }
}

run();
