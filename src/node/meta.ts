import { extractSeries } from "./extraction";
import { Info, Link, ProviderContext } from "./types";

const hdbHeaders = {
  Cookie: "xla=s4t",
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};
export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("hdhub");
    const url = link.startsWith("http") ? link : `${baseUrl.replace(/\/$/, "")}/${link.replace(/^\//, "")}`;
    const res = await axios.get(url, { headers: hdbHeaders });
    const data = res.data;
    const $ = cheerio.load(data);

    // Fallback: The site moved away from .page-body in some cases
    let container = $(".page-body");
    if (container.length === 0) {
      container = $("#primary, .page-content, main, article").first();
    }
    // Final fallback to body if no container found
    if (container.length === 0) {
      container = $("body");
    }

    const imdbId =
      container
        .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
        .attr("href")
        ?.split("/")[4] ||
      data.match(/imdb\.com\/title\/(tt\d+)/)?.[1] || "";

    let title = $("h1.page-title .material-text").text().trim();
    if (!title) {
      title = container.find(".entry-title, .page-title, h1").first().text().trim();
    }
    // Fallback to page title if still empty, cleaning up common suffixes
    if (!title) {
      title = $("title").text().replace("– HDHub4u", "").replace("Official", "").replace("Page not found –", "").trim();
    }

    console.log(`🔎 Debug: Detected Title: "${title}"`);

    // Check both title and URL for series indicators
    let isSeries = title.toLocaleLowerCase().includes("season") ||
      link.toLocaleLowerCase().includes("season") ||
      link.toLocaleLowerCase().includes("series") ||
      title.toLocaleLowerCase().includes("series");

    let extractedSeasons: any[] = [];

    // Fallback: If not detected as series by title/URL, try scanning content
    if (!isSeries) {
      console.log("🕵️‍♀️ Initial check failed, scanning content for episodes...");
      extractedSeasons = extractSeries(container.html() || data);
      if (extractedSeasons.length > 0) {
        console.log(`✅ Content scan found ${extractedSeasons.length} seasons.`);
        isSeries = true;
      }
    }

    const type = isSeries ? "series" : "movie";

    console.log(`🔎 Debug: Determined Type: "${type}"`);

    // Synopsis Extraction Strategy
    let synopsis = $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    if (!synopsis) {
      synopsis = container
        .find('strong:contains("DESCRIPTION"), strong:contains("SYNOPSIS"), strong:contains("PLOT")')
        .parent()
        .text()
        .replace(/DESCRIPTION:|SYNOPSIS:|PLOT:/i, "")
        .trim();
    }

    // Fallback: Check if description is in a paragraph following a specific header
    if (!synopsis) {
      synopsis = container.find("h3:contains('Storyline'), h3:contains('Synopsis')").next("p").text().trim();
    }

    // Clean up
    synopsis = synopsis.trim();
    const image = container.find('img[decoding="async"]').attr("src") ||
      container.find('img').first().attr('src') || "";

    // Extract Runtime with multiple strategies
    let duration = container
      .find('strong:contains("RunTime")')
      .parent()
      .text()
      .replace(/RunTime:|Runtime:/i, "")
      .trim();

    // Fallback: Regex on full text if selector failed
    if (!duration) {
      const match = data.match(/RunTime:\s*(.*?)(?:\n|<)/i);
      if (match && match[1]) {
        duration = match[1].trim();
      }
    }

    // Series Handling
    if (type === "series") {
      console.log("📺 Detected Series content, using season extractor...");
      const seasons = extractedSeasons.length > 0 ? extractedSeasons : extractSeries(container.html() || data);
      const links: Link[] = [];

      seasons.forEach(season => {
        const seasonLinks: Link["directLinks"] = season.episodes.map((ep: any) => ({
          title: ep.title,
          link: ep.link,
          type: "series"
        }));

        if (seasonLinks.length > 0) {
          links.push({
            title: season.title,
            directLinks: seasonLinks
          });
        }
      });

      return {
        title, synopsis, image, imdbId, type, linkList: links, seasons, duration
      };
    }

    // Movie Handling
    const links: Link[] = [];

    // Multi-strategy link extraction
    container.find("a").each((i: number, el: any) => {
      const a = $(el);
      const href = a.attr("href");
      const text = a.text().trim();

      if (!href || href === "#" || href.includes("javascript:")) return;

      // Skip common non-movie links
      if (text.match(/Telegram|Discord|How to Download|Disclaimer/i)) return;

      const qualityMatch = text.match(/\b(480p|720p|1080p|2160p|4K|B(lu)?Ray|REMUX)\b/i);
      const episodeMatch = text.match(/EPiSODE|Season/i);

      if (qualityMatch) {
        const quality = qualityMatch[0];
        links.push({
          title: text || "Movie Link",
          quality: quality,
          directLinks: [{
            title: text,
            link: href,
            type: "movie"
          }]
        });
      } else if (text.match(/WATCH|PLAYER/i)) {
        links.push({
          title: text,
          directLinks: [{
            title: text,
            link: href,
            type: "movie"
          }]
        });
      }
    });

    // Fallback to legacy EPiSODE scanning if no links found
    if (links.length === 0) {
      container.find('a:contains("EPiSODE")').each((i: number, element: any) => {
        const epTitle = $(element).text();
        const episodesLink = $(element).attr("href");
        if (episodesLink) {
          links.push({
            title: epTitle.toUpperCase(),
            directLinks: [{
              title: epTitle,
              link: episodesLink,
              type: "movie"
            }],
          });
        }
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList: links,
      duration
    };
  } catch (err) {
    console.error(err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
