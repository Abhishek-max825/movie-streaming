import { getMeta } from "../node/meta";
import { getSearchPosts } from "../node/posts";
import { ProviderContext } from "../node/types";
import * as cheerio from "cheerio";

// Mock Axios
const mockAxios = {
    get: jest.fn(),
};

// Mock ProviderContext
const mockProviderContext: ProviderContext = {
    axios: mockAxios as any,
    cheerio: cheerio,
    extractors: {
        hubcloudExtracter: jest.fn(),
    },
    commonHeaders: {},
    getBaseUrl: jest.fn().mockResolvedValue("https://example.com"),
};

describe("Movies Streaming Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getMeta", () => {
        it("should extract movie metadata correctly", async () => {
            const html = `
        <html>
          <head><title>Test Movie (2023) – HDHub4u</title></head>
          <body class="page-body">
            <h1>Test Movie (2023)</h1>
            <img decoding="async" src="https://example.com/poster.jpg" />
            <strong>DESCRIPTION</strong>
            <p>This is a test synopsis.</p>
            <a href="https://imdb.com/title/tt1234567">IMDB</a>
            <a href="https://example.com/download/1080p">Download 1080p</a>
          </body>
        </html>
      `;

            mockAxios.get.mockResolvedValue({ data: html });

            const result = await getMeta({
                link: "https://example.com/movie",
                providerContext: mockProviderContext,
            });

            expect(result.title).toBe("Test Movie (2023)");
            expect(result.type).toBe("movie");
            expect(result.imdbId).toBe("tt1234567");
            expect(result.image).toBe("https://example.com/poster.jpg");
            expect(result.linkList.length).toBeGreaterThan(0);
            expect(result.linkList[0].quality).toBe("1080p");
        });

        it("should handle series metadata", async () => {
            const html = `
        <html>
          <body class="page-body">
            <h1>Test Series Season 1</h1>
            <p><a href="https://example.com/ep1">EPiSODE 1</a></p>
          </body>
        </html>
      `;

            mockAxios.get.mockResolvedValue({ data: html });

            const result = await getMeta({
                link: "https://example.com/series",
                providerContext: mockProviderContext,
            });

            expect(result.title).toBe("Test Series Season 1");
            expect(result.type).toBe("series");
            expect(result.linkList.length).toBeGreaterThan(0);
            expect(result.linkList[0].directLinks[0].title).toBe("Episode 1");
        });
    });

    describe("getSearchPosts", () => {
        it("should parse search results correctly", async () => {
            // Mock fetch for getSearchPosts (it uses fetch, not axios in posts.ts)
            global.fetch = jest.fn().mockResolvedValue({
                text: jest.fn().mockResolvedValue(`
          <div class="recent-movies">
            <article>
              <figure>
                <img src="https://example.com/thumb.jpg" alt="Test Movie Download" />
              </figure>
              <a href="https://example.com/post">Link</a>
            </article>
          </div>
        `),
            } as any);

            const controller = new AbortController();
            const results = await getSearchPosts({
                searchQuery: "Test",
                page: 1,
                providerValue: "hdhub",
                providerContext: mockProviderContext,
                signal: controller.signal,
            });

            expect(results.length).toBe(1);
            expect(results[0].title).toBe("Test Movie"); // "Download" stripped
            expect(results[0].link).toBe("https://example.com/post");
            expect(results[0].image).toBe("https://example.com/thumb.jpg");
        });

        it("should handle empty results", async () => {
            global.fetch = jest.fn().mockResolvedValue({
                text: jest.fn().mockResolvedValue('<div class="recent-movies"></div>'),
            } as any);

            const controller = new AbortController();
            const results = await getSearchPosts({
                searchQuery: "NotFound",
                page: 1,
                providerValue: "hdhub",
                providerContext: mockProviderContext,
                signal: controller.signal,
            });

            expect(results.length).toBe(0);
        });
    });
});
