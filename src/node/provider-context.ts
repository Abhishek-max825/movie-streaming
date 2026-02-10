import axios from "axios";
import * as cheerio from "cheerio";
import { ProviderContext } from "./types";
import { hubcloudExtracter } from "./extractors";

/**
 * Creates the provider context with all necessary tools and configuration
 */
export function createProviderContext(): ProviderContext {
    const commonHeaders = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    };

    const axiosInstance = axios.create({
        timeout: 30000,
        headers: commonHeaders,
        maxRedirects: 5,
    });

    return {
        axios: axiosInstance,
        cheerio: cheerio,
        extractors: {
            hubcloudExtracter: hubcloudExtracter,
        },
        commonHeaders: commonHeaders,
        getBaseUrl: async (provider: string) => {
            // You can implement dynamic base URL fetching here if needed
            // Current working domain as of Nov 2025
            const baseUrls: Record<string, string> = {
                hdhub: "https://new1.hdhub4u.fo",
                // Add other mirrors as fallbacks
            };
            return baseUrls[provider] || baseUrls.hdhub;
        },
    };
}
