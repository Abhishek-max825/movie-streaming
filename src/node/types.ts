import { AxiosInstance } from "axios";

export interface Post {
    title: string;
    link: string;
    image: string;
}

export interface DirectLink {
    title: string;
    link: string;
    type?: string;
}

export interface Link {
    title: string;
    quality?: string;
    directLinks: DirectLink[];
}

export interface Info {
    title: string;
    synopsis: string;
    image: string;
    imdbId: string;
    type: "movie" | "series";
    linkList: Link[];
    seasons?: Season[];
    duration?: string;
}

export interface Episode {
    title: string;
    link: string;
}

export interface Season {
    title: string;
    episodes: Episode[];
}

export interface Stream {
    quality: string;
    url: string;
    type?: string;
}

export interface Extractors {
    hubcloudExtracter: (link: string, signal: AbortSignal) => Promise<Stream[]>;
}

export interface ProviderContext {
    axios: AxiosInstance;
    cheerio: any;
    extractors: Extractors;
    commonHeaders: Record<string, string>;
    getBaseUrl: (provider: string) => Promise<string>;
}
