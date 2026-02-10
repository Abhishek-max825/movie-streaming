import { createProviderContext } from "./provider-context";
import { getSearchPosts } from "./posts";
import { getMeta } from "./meta";
import { getStream } from "./stream";

async function main() {
    const context = createProviderContext();
    const controller = new AbortController();
    const signal = controller.signal;

    // console.log("🔍 Searching for 'Kantara'...");
    const posts = await getSearchPosts({
        searchQuery: "Kantara",
        page: 1,
        providerValue: "hdhub",
        providerContext: context,
        signal,
    });

    if (posts.length === 0) {
        // console.error("❌ No results found for 'Kantara'");
        return;
    }

    const firstPost = posts[0];
    // console.log(`✅ Found: ${firstPost.title}`);
    // console.log(`🔗 Link: ${firstPost.link}`);

    // console.log("📄 Fetching metadata...");
    const meta = await getMeta({
        link: firstPost.link,
        providerContext: context,
    });

    // Find a 720p or 1080p link
    const targetLink = meta.linkList.find(
        (l) => l.quality?.includes("720p") || l.quality?.includes("1080p")
    );

    if (!targetLink || targetLink.directLinks.length === 0) {
        // console.error("❌ No suitable video links found");
        return;
    }

    const videoPageLink = targetLink.directLinks[0].link;
    // console.log(`🔗 Video Page Link: ${videoPageLink}`);

    // console.log("🌊 Extracting stream...");
    const streams = await getStream({
        link: videoPageLink,
        type: "movie",
        signal,
        providerContext: context,
    });

    if (streams.length > 0) {
        console.log(streams[0].url);
    } else {
        // console.error("❌ Failed to extract stream URL");
    }
}

main().catch(console.error);
