import { Post, ProviderContext } from "./types";

const hdbHeaders = {
  Cookie: "xla=s4t",
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("hdhub");
  const url = `${baseUrl + filter}/page/${page}/`;
  return posts({ url, signal, providerContext });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  const { getBaseUrl, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl("hdhub");

  // Use the new Pingora search API which returns JSON
  const apiUrl = `https://search.pingora.fyi/collections/post/documents/search?q=${encodeURIComponent(searchQuery)}&query_by=post_title,category&sort_by=sort_by_date:desc&limit=20&page=${page}&highlight_fields=none&use_cache=true`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        ...commonHeaders,
        "Origin": baseUrl,
        "Referer": baseUrl + "/"
      }
    });

    if (!res.ok) throw new Error(`Search API failed with status: ${res.status}`);

    const data = await res.json();
    const catalog: Post[] = [];

    if (data.hits) {
      data.hits.forEach((hit: any) => {
        const doc = hit.document;
        // The API returns high-quality TMDB images which are not blocked
        const image = doc.post_thumbnail || 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/315px-No-Image-Placeholder.svg.png';

        catalog.push({
          title: doc.post_title.replace("Download", "").trim(),
          link: doc.permalink,
          image: image,
        });
      });
    }

    return catalog;
  } catch (err) {
    console.error("getSearchPosts API error:", err);
    return [];
  }
};

async function posts({
  url,
  signal,
  providerContext,
}: {
  url: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { cheerio } = providerContext;
  try {
    // console.log("📡 Fetching:", url);
    const res = await fetch(url, {
      headers: hdbHeaders,
      signal,
    });
    const data = await res.text();
    // console.log("📄 HTML length:", data.length);

    const $ = cheerio.load(data);
    const catalog: Post[] = [];

    const recentMovies = $(".recent-movies");
    // console.log("🎬 Found .recent-movies:", recentMovies.length);

    $(".recent-movies")
      .children()
      .map((i: number, element: any) => {
        const title = $(element).find("figure").find("img").attr("alt");
        const link = $(element).find("a").attr("href");
        const image = $(element).find("figure").find("img").attr("src");

        if (title && link && image) {
          catalog.push({
            title: title.replace("Download", "").trim(),
            link: link,
            image: image,
          });
        }
      });

    // console.log(`✅ Extracted ${catalog.length} post(s)`);
    return catalog;
  } catch (err) {
    console.error("hdhubGetPosts error:", err);
    return [];
  }
}
