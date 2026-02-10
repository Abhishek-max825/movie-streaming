// Re-export types from backend to ensure consistency
// If direct import fails due to environment, these interfaces should be mirrored manually.

export type { Post, Info, Link, Stream } from '@backend/types';

export interface SearchResponse {
    results: import('@backend/types').Post[];
}

export interface StreamResponse {
    streamUrl: string;
    proxyUrl: string;
    headers?: Record<string, string>;
}
