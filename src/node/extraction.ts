import * as cheerio from "cheerio";
import { Season, Episode } from "./types";

export function extractSeries(html: string): Season[] {
    const $ = cheerio.load(html);
    const seasonMap = new Map<string, Episode[]>();

    // Helper to get or create season bucket
    const getSeasonBucket = (name: string) => {
        if (!seasonMap.has(name)) {
            seasonMap.set(name, []);
        }
        return seasonMap.get(name)!;
    };

    let currentSeason = "Season 1"; // Default

    // Scan for all headers and paragraphs that might contain episode info
    $('h3, h4, h5, p, div, span').each((_, el) => {
        const text = $(el).text().trim();

        // Check if this line defines a new season context (e.g. "Season 2")
        const seasonMatch = text.match(/Season\s*(\d+)/i);
        if (seasonMatch && $(el).find('a').length === 0 && text.length < 50) {
            // Only if it's a header-like element without links, likely a section header
            currentSeason = `Season ${seasonMatch[1]}`;
            return; // Move to next element
        }

        // Check for Episode pattern: E01, Episode 1, Ep 1, etc.
        // We look for patterns that START with the episode indicator or are clearly labeling it.
        const epMatch = text.match(/(?:^|\s|\|)(?:E|EP|Episode)\s*[-.]?\s*(\d+)/i);

        if (epMatch) {
            const epNum = epMatch[1];
            console.log(`DEBUG: Matched Episode "${epNum}" in text: "${text.substring(0, 50)}..."`);
            const title = `Episode ${epNum}`;

            // Find links within this element
            const links = $(el).find('a');

            // We prioritize links with text "Watch", "Drive", or "Instant"
            // If none, take the first link found.
            let validLink: string | null = null;

            // Priority list
            const priorityTexts = ["Drive", "Instant", "Watch", "Download", "720p", "1080p", "480p"];

            // First pass: exact priority match
            for (const pText of priorityTexts) {
                const found = links.filter((i, linkEl) => $(linkEl).text().trim().includes(pText)).first();
                if (found.length > 0) {
                    validLink = found.attr('href') || null;
                    if (validLink) break;
                }
            }

            // Second pass: any link
            if (!validLink && links.length > 0) {
                validLink = links.first().attr('href') || null;
            }

            // Fallback: Check NEXT element if no links found in current
            if (!validLink) {
                const nextEl = $(el).next();
                const nextLinks = nextEl.find('a');
                if (nextLinks.length > 0) {
                    // Check priority text in next element
                    for (const pText of priorityTexts) {
                        const found = nextLinks.filter((i, linkEl) => $(linkEl).text().trim().includes(pText)).first();
                        if (found.length > 0) {
                            validLink = found.attr('href') || null;
                            if (validLink) break;
                        }
                    }
                    // Fallback to first link of next element
                    if (!validLink) {
                        validLink = nextLinks.first().attr('href') || null;
                    }
                }
            }

            if (validLink) {
                // Check if we already have this episode in this season to avoid duplicates
                // (sometimes text is repeated in spans inside h4)
                const bucket = getSeasonBucket(currentSeason);
                if (!bucket.find(e => e.title === title)) {
                    bucket.push({
                        title: title,
                        link: validLink
                    });
                }
            }
        }
    });

    // Sort seasons
    const sortedSeasons = Array.from(seasonMap.keys()).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    const results: Season[] = [];
    sortedSeasons.forEach(seasonName => {
        const episodes = seasonMap.get(seasonName) || [];
        if (episodes.length > 0) {
            // Sort episodes
            episodes.sort((a, b) => {
                const epA = parseInt(a.title.replace(/\D/g, '')) || 0;
                const epB = parseInt(b.title.replace(/\D/g, '')) || 0;
                return epA - epB;
            });

            results.push({
                title: seasonName,
                episodes: episodes
            });
        }
    });

    // Fallback: If no structured episodes found, try the old generic logic for one last attempt?
    // Current logic is quite broad (h3, h4, p, div, span), so it should catch most.

    return results;
}
