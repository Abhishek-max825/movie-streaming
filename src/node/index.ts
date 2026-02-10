#!/usr/bin/env ts-node
import readlineSync from "readline-sync";
import { spawn } from "child_process";
import path from "path";
import { createProviderContext } from "./provider-context";
import { getSearchPosts } from "./posts";
import { getMeta } from "./meta";
import { getStream } from "./stream";
import { Info, Stream } from "./types";

// ANSI color codes for better UX
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m",
};

function log(message: string, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function header(message: string) {
    console.log("\n" + "=".repeat(60));
    log(message, colors.bright + colors.cyan);
    console.log("=".repeat(60) + "\n");
}

function error(message: string) {
    log(`❌ ${message}`, colors.red);
}

function success(message: string) {
    log(`✅ ${message}`, colors.green);
}

function info(message: string) {
    log(`ℹ️  ${message}`, colors.blue);
}

async function main() {
    header("🎬 HDHub Movie/Series Stream Tester");

    const providerContext = createProviderContext();
    const controller = new AbortController();

    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
        log("\n\n👋 Exiting...", colors.yellow);
        controller.abort();
        process.exit(0);
    });

    try {
        // Step 1: Search for content
        header("🔍 Step 1: Search for Movies/Series");
        const searchQuery = readlineSync.question(
            `${colors.cyan}Enter movie or series name: ${colors.reset}`
        );

        if (!searchQuery.trim()) {
            error("Search query cannot be empty!");
            return;
        }

        info(`Searching for "${searchQuery}"...`);
        const searchResults = await getSearchPosts({
            searchQuery: searchQuery,
            page: 1,
            providerValue: "hdhub",
            providerContext,
            signal: controller.signal,
        });

        if (searchResults.length === 0) {
            error("No results found! Try a different search term.");
            return;
        }

        success(`Found ${searchResults.length} result(s)\n`);

        // Display results
        searchResults.forEach((result, index) => {
            console.log(
                `${colors.yellow}[${index + 1}]${colors.reset} ${colors.bright}${result.title
                }${colors.reset}`
            );
            console.log(`    Link: ${colors.cyan}${result.link}${colors.reset}`);
            console.log(`    Image: ${result.image}\n`);
        });

        // Step 2: Select a result
        const selectedIndex = readlineSync.questionInt(
            `${colors.cyan}Select a number (1-${searchResults.length}): ${colors.reset}`,
            { limit: (input: string) => Number(input) >= 1 && Number(input) <= searchResults.length }
        );

        const selectedPost = searchResults[selectedIndex - 1];
        header(`📺 Selected: ${selectedPost.title}`);

        // Step 3: Get metadata
        info("Fetching metadata...");
        const metadata = await getMeta({
            link: selectedPost.link,
            providerContext,
        });

        if (!metadata || !metadata.title) {
            error("Failed to fetch metadata!");
            return;
        }

        success("Metadata fetched successfully!\n");
        displayMetadata(metadata);

        // Step 4: Handle Movie vs Series
        if (metadata.type === "movie") {
            await handleMovie(metadata, providerContext, controller.signal);
        } else if (metadata.type === "series") {
            await handleSeries(metadata, providerContext, controller.signal);
        } else {
            error("Unknown content type!");
        }
    } catch (err: any) {
        if (err.message === "canceled") {
            log("\n👋 Operation cancelled by user", colors.yellow);
        } else {
            error(`An error occurred: ${err.message}`);
            console.error(err);
        }
    }
}

function displayMetadata(metadata: Info) {
    log(`Title: ${metadata.title}`, colors.bright);
    log(`Type: ${metadata.type.toUpperCase()}`, colors.magenta);
    log(`IMDB ID: ${metadata.imdbId || "N/A"}`, colors.cyan);
    log(`Synopsis: ${metadata.synopsis || "N/A"}`, colors.reset);
    console.log(`Image: ${metadata.image}\n`);
}

async function handleMovie(
    metadata: Info,
    providerContext: any,
    signal: AbortSignal
) {
    header("🎬 Movie Flow");

    if (metadata.linkList.length === 0) {
        error("No download links available!");
        return;
    }

    // Display available qualities
    log("Available qualities:", colors.bright);
    metadata.linkList.forEach((link, index) => {
        console.log(
            `${colors.yellow}[${index + 1}]${colors.reset} ${link.title} ${link.quality ? `(${link.quality})` : ""
            }`
        );
    });

    const qualityIndex = readlineSync.questionInt(
        `\n${colors.cyan}Select quality (1-${metadata.linkList.length}): ${colors.reset}`,
        { limit: (input: string) => Number(input) >= 1 && Number(input) <= metadata.linkList.length }
    );

    const selectedLink = metadata.linkList[qualityIndex - 1];

    if (!selectedLink.directLinks || selectedLink.directLinks.length === 0) {
        error("No direct links available for this quality!");
        return;
    }

    const directLink = selectedLink.directLinks[0];

    header(`🔗 Extracting Stream for: ${selectedLink.title}`);
    info(`Processing link: ${directLink.link}`);

    try {
        const streams = await getStream({
            link: directLink.link,
            type: "movie",
            signal,
            providerContext,
        });

        if (streams.length === 0) {
            error("No streams extracted!");
            return;
        }

        success(`Found ${streams.length} stream(s)! Showing first stream:\n`);
        // Only display the first stream (usually the working one)
        const firstStream = streams[0];
        console.log(
            `${colors.yellow}[Stream 1]${colors.reset} Quality: ${firstStream.quality}`
        );
        log(`URL: ${firstStream.url}`, colors.green);
        console.log();

        // Ask if user wants to test download
        const testDownload = readlineSync.keyInYN(
            `${colors.cyan}Would you like to copy the first URL to clipboard? ${colors.reset}`
        );

        if (testDownload) {
            success(`\n📋 Copy this URL:\n${streams[0].url}`);
        }

        // Check for ZIP
        if (firstStream.url.includes(".zip")) {
            await handleZipStream(firstStream.url);
        }
    } catch (err: any) {
        error(`Stream extraction failed: ${err.message}`);
    }
}

async function handleSeries(
    metadata: Info,
    providerContext: any,
    signal: AbortSignal
) {
    header("📺 Series Flow");

    if (metadata.linkList.length === 0) {
        error("No seasons/episodes available!");
        return;
    }

    // Group episodes by season if possible
    const seasons = metadata.linkList;

    // Display available seasons/episodes
    log("Available content:", colors.bright);
    seasons.forEach((season, index) => {
        console.log(
            `${colors.yellow}[${index + 1}]${colors.reset} ${season.title} (${season.directLinks.length
            } link(s))`
        );
    });

    const seasonIndex = readlineSync.questionInt(
        `\n${colors.cyan}Select season/group (1-${seasons.length}): ${colors.reset}`,
        { limit: (input: string) => Number(input) >= 1 && Number(input) <= seasons.length }
    );

    const selectedSeason = seasons[seasonIndex - 1];

    // Display episodes
    header(`Episodes in: ${selectedSeason.title}`);
    selectedSeason.directLinks.forEach((ep, index) => {
        console.log(
            `${colors.yellow}[${index + 1}]${colors.reset} ${ep.title}`
        );
    });

    const episodeIndex = readlineSync.questionInt(
        `\n${colors.cyan}Select episode (1-${selectedSeason.directLinks.length}): ${colors.reset}`,
        {
            limit: (input: string) =>
                Number(input) >= 1 && Number(input) <= selectedSeason.directLinks.length,
        }
    );

    const selectedEpisode = selectedSeason.directLinks[episodeIndex - 1];

    header(`🔗 Extracting Stream for: ${selectedEpisode.title}`);
    info(`Processing link: ${selectedEpisode.link}`);

    try {
        const streams = await getStream({
            link: selectedEpisode.link,
            type: "series",
            signal,
            providerContext,
        });

        if (streams.length === 0) {
            error("No streams extracted!");
            return;
        }

        success(`Found ${streams.length} stream(s)! Showing first stream:\n`);
        // Only display the first stream (usually the working one)
        const firstStream = streams[0];
        console.log(
            `${colors.yellow}[Stream 1]${colors.reset} Quality: ${firstStream.quality}`
        );
        log(`URL: ${firstStream.url}`, colors.green);
        console.log();

        // Ask if user wants to copy URL
        const testDownload = readlineSync.keyInYN(
            `${colors.cyan}Would you like to copy the first URL? ${colors.reset}`
        );

        if (testDownload) {
            success(`\n📋 Copy this URL:\n${streams[0].url}`);
        }

        // Check for ZIP
        if (firstStream.url.includes(".zip")) {
            await handleZipStream(firstStream.url);
        }
    } catch (err: any) {
        error(`Stream extraction failed: ${err.message}`);
    }
}

async function handleZipStream(url: string) {
    header("📦 ZIP Archive Detected");
    info("Fetching file list from remote ZIP...");

    const pythonScript = path.join(__dirname, "../python/zip_helper.py");

    return new Promise<void>((resolve, reject) => {
        const proc = spawn("python", [pythonScript, "list", "--url", url]);

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        proc.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        proc.on("close", (code) => {
            if (code !== 0) {
                error(`Failed to list ZIP contents: ${stderr}`);
                resolve();
                return;
            }

            try {
                const files = JSON.parse(stdout);
                if (files.length === 0) {
                    error("No video files found in ZIP!");
                    resolve();
                    return;
                }

                log("Files in archive:", colors.bright);
                files.forEach((f: string, i: number) => {
                    console.log(`${colors.yellow}[${i + 1}]${colors.reset} ${f}`);
                });

                const fileIndex = readlineSync.questionInt(
                    `\n${colors.cyan}Select file to stream (1-${files.length}): ${colors.reset}`,
                    { limit: (input: string) => Number(input) >= 1 && Number(input) <= files.length }
                );

                const selectedFile = files[fileIndex - 1];
                info(`Selected: ${selectedFile}`);

                // Start stream proxy
                startStreamProxy(url, selectedFile);
                resolve();

            } catch (e) {
                error("Failed to parse ZIP file list.");
                console.error(e);
                resolve();
            }
        });
    });
}

function startStreamProxy(url: string, zipFile: string) {
    header("🚀 Starting Stream Proxy");
    const proxyScript = path.join(__dirname, "../python/stream_proxy.py");

    const args = [proxyScript, "--url", url, "--zip-file", zipFile];

    const proc = spawn("python", args, { stdio: "inherit" });

    proc.on("close", (code) => {
        log(`Proxy exited with code ${code}`, colors.yellow);
    });
}

// Run the main function
main().catch((err) => {
    error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
});
