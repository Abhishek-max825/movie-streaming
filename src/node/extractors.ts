import axios from "axios";
import * as cheerio from "cheerio";
import { Stream } from "./types";

/**
 * Validates if a URL points to actual video content (not HTML error page)
 * Returns true if valid video, false if deleted/unavailable
 */
async function validateStreamUrl(url: string): Promise<boolean> {
    try {
        const response = await axios.head(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://new1.hdhub4u.fo/",
            },
            timeout: 10000,
            maxRedirects: 5,
        });

        const contentType = response.headers["content-type"]?.toLowerCase() || "";

        // Valid video content types
        const validTypes = ["video/", "application/octet-stream", "application/x-mpegurl"];
        const isValid = validTypes.some(type => contentType.includes(type));

        if (!isValid) {
            console.log(`⚠️  Invalid Content-Type for ${url.substring(0, 60)}: ${contentType}`);
        }

        return isValid;
    } catch (error: any) {
        console.log(`⚠️  Failed to validate URL ${url.substring(0, 60)}: ${error.message}`);
        // If HEAD request fails, do a GET to check content
        try {
            const response = await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://hdhub4u.rehab/",
                },
                timeout: 10000,
                maxContentLength: 5000, // Only fetch first 5KB
            });

            const contentType = response.headers["content-type"]?.toLowerCase() || "";
            const validTypes = ["video/", "application/octet-stream", "application/x-mpegurl"];
            const isValid = validTypes.some(type => contentType.includes(type));

            // Also check if response contains error messages
            if (contentType.includes("text/html")) {
                const html = response.data.toString().toLowerCase();
                if (html.includes("deleted") || html.includes("unavailable") || html.includes("not found")) {
                    console.log(`❌ URL points to deleted/unavailable file: ${url.substring(0, 60)}`);
                    return false;
                }
            }

            return isValid;
        } catch {
            // If both requests fail, assume invalid
            return false;
        }
    }
}

/**
 * Extracts video streams from hubcloud links
 * This handles the final step of extracting actual video URLs from hubcloud pages
 */
export async function hubcloudExtracter(
    link: string,
    signal: AbortSignal
): Promise<Stream[]> {
    try {
        // console.log("🔍 Extracting from hubcloud:", link);

        const headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Referer: "https://google.com",
        };

        const response = await axios.get(link, { headers, signal });
        const html = response.data;
        const $ = cheerio.load(html);

        const streams: Stream[] = [];

        // Try to find video sources in various formats
        // Method 1: Look for direct video tags
        $("video source").each((i, elem) => {
            const src = $(elem).attr("src");
            const type = $(elem).attr("type") || "video/mp4";
            if (src) {
                streams.push({
                    quality: "auto",
                    url: src,
                    type: type,
                });
            }
        });

        // Method 2: Look for quality selection buttons/links
        $('a[href*=".mp4"], a[href*=".m3u8"]').each((i, elem) => {
            const href = $(elem).attr("href");
            const text = $(elem).text().trim();
            const quality = text.match(/(\d+p|HD|SD|4K)/i)?.[0] || "unknown";

            if (href && href.startsWith("http")) {
                streams.push({
                    quality: quality,
                    url: href,
                });
            }
        });

        // Method 3: Search for video URLs in script tags
        $("script").each((i, elem) => {
            const scriptContent = $(elem).html() || "";

            // Look for file: "url" patterns
            const fileMatches = scriptContent.match(/file:\s*["']([^"']+)["']/g);
            if (fileMatches) {
                fileMatches.forEach((match) => {
                    const url = match.match(/["']([^"']+)["']/)?.[1];
                    if (url && (url.includes(".mp4") || url.includes(".m3u8"))) {
                        streams.push({
                            quality: "auto",
                            url: url,
                        });
                    }
                });
            }

            // Look for sources array
            const sourcesMatch = scriptContent.match(
                /sources:\s*\[([^\]]+)\]/
            );
            if (sourcesMatch) {
                const sourcesContent = sourcesMatch[1];
                const urlMatches = sourcesContent.match(/["']([^"']+\.(?:mp4|m3u8))["']/g);
                if (urlMatches) {
                    urlMatches.forEach((match) => {
                        const url = match.replace(/["']/g, "");
                        streams.push({
                            quality: "auto",
                            url: url,
                        });
                    });
                }
            }
        });

        // Method 4: Look for download buttons and follow through multi-level intermediate pages
        const downloadButtons = $('a:contains("Download"), button:contains("Download"), a:contains("Server")');

        // Parallelize button processing for significantly faster extraction
        const buttonPromises = Array.from(downloadButtons).map(async (elem) => {
            const href = $(elem).attr("href");
            const text = $(elem).text();
            const quality = text.match(/(\d+p|HD|SD|4K|10Gbps|FSL)/i)?.[0] || "unknown";

            if (href && href.includes("http")) {
                const isIntermediate = href.includes("gamerxyt.com") ||
                    href.includes("pixel.hubcdn") ||
                    href.includes("pixlor-downloads");

                if (isIntermediate) {
                    try {
                        const page1 = await axios.get(href, { headers, signal });
                        const html1 = page1.data;
                        const $page1 = cheerio.load(html1);

                        const level1Buttons = $page1('a:contains("Download"), a:contains("Server"), a:contains("10Gbps")');
                        if (level1Buttons.length > 0) {
                            const level1Href = $page1(level1Buttons[0]).attr("href");
                            if (level1Href && level1Href.includes("http")) {
                                if (level1Href.includes("pixel.hubcdn") || level1Href.includes("pixlor-downloads")) {
                                    try {
                                        const page2 = await axios.get(level1Href, { headers, signal });
                                        const html2 = page2.data;
                                        const $page2 = cheerio.load(html2);
                                        const finalButton = $page2('a:contains("Download Here"), a:contains("Download"), a[href*="googleusercontent"]');
                                        if (finalButton.length > 0) {
                                            const finalUrl = $page2(finalButton[0]).attr("href");
                                            if (finalUrl && finalUrl.includes("http")) {
                                                return { quality, url: finalUrl };
                                            }
                                        }
                                        return { quality, url: level1Href };
                                    } catch {
                                        return { quality, url: level1Href };
                                    }
                                } else {
                                    return { quality, url: level1Href };
                                }
                            }
                        }
                        return { quality, url: href };
                    } catch {
                        return { quality, url: href };
                    }
                } else {
                    return { quality, url: href };
                }
            }
            return null;
        });

        const extractedStreams = (await Promise.all(buttonPromises)).filter(s => s !== null) as Stream[];
        streams.push(...extractedStreams);

        if (streams.length === 0) {
            // console.warn("⚠️  No streams found, returning raw link");
            streams.push({
                quality: "direct",
                url: link,
            });
        }

        // Remove duplicates
        const uniqueStreams = streams.filter(
            (stream, index, self) =>
                index === self.findIndex((s) => s.url === stream.url)
        );

        // VALIDATION DISABLED: Let the proxy handle stream validation during playback
        // The strict validation was causing 403 errors and blocking valid streams
        // that require specific headers/referers only available during actual playback
        console.log(`✅ Extracted ${uniqueStreams.length} stream(s) (validation disabled)`);

        /* ORIGINAL VALIDATION CODE - DISABLED
        console.log(`🔍 Validating ${uniqueStreams.length} extracted stream(s)...`);
        const validatedStreams: Stream[] = [];

        for (const stream of uniqueStreams) {
            const isValid = await validateStreamUrl(stream.url);
            if (isValid) {
                validatedStreams.push(stream);
                console.log(`✅ Valid stream: ${stream.quality} - ${stream.url.substring(0, 60)}...`);
            } else {
                console.log(`❌ Skipping invalid stream: ${stream.quality} - ${stream.url.substring(0, 60)}...`);
            }
        }

        if (validatedStreams.length === 0) {
            console.warn("⚠️  All extracted URLs were invalid (deleted/unavailable files)");
        } else {
            console.log(`✅ Found ${validatedStreams.length} valid stream(s)`);
        }

        return validatedStreams;
        */

        // Return all streams without validation
        return uniqueStreams;
    } catch (error: any) {
        console.error("❌ Hubcloud extraction error:", error.message);
        return [];
    }
}
