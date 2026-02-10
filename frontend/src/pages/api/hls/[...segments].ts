import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

/**
 * HLS Proxy API Route
 * 
 * Proxies HLS stream requests from port 3000 (accessible via dev tunnel)
 * to port 8000 (local stream proxy), enabling mobile streaming.
 * 
 * Usage:
 * - Master playlist: /api/hls/stream.m3u8?port=8000
 * - Segments: /api/hls/segment_0_00001.ts?port=8000
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { segments } = req.query;
        const port = req.query.port as string;

        // Validate port parameter
        if (!port) {
            return res.status(400).json({ error: 'Port parameter is required' });
        }

        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
            return res.status(400).json({ error: 'Invalid port number' });
        }

        // Reconstruct the file path from segments array
        const filePath = Array.isArray(segments) ? segments.join('/') : segments;
        if (!filePath) {
            return res.status(400).json({ error: 'No file path specified' });
        }

        // Build the upstream URL (localhost proxy)
        const upstreamUrl = `http://127.0.0.1:${portNum}/hls/${filePath}`;

        console.log(`[HLS Proxy] Proxying: ${filePath} from port ${portNum}`);

        // Check if it's a playlist or a segment based on file extension
        const isPlaylist = filePath.endsWith('.m3u8');

        if (isPlaylist) {
            // For playlists, we need to rewrite URLs to include the port parameter
            const response = await axios.get(upstreamUrl, {
                responseType: 'text',
                timeout: 15000, // Reduced from 10000 to fail faster? No, increased to 15s for stability
                validateStatus: () => true, // Don't throw on error immediately
            });

            if (response.status >= 400) {
                console.error(`[HLS Proxy] Upstream error: ${response.status} for ${upstreamUrl}`);
                // If 404, maybe the proxy is still waking up or the file isn't ready. 
                // But for playlists, 404 usually means it's not ready.
                if (response.status === 404) {
                    throw new Error('Upstream 404');
                }
                throw new Error(`Upstream error ${response.status}`);
            }

            let playlistContent = response.data;

            // Rewrite relative URLs in the playlist to include port parameter
            // Match ANY .m3u8 file (variant playlists) and ANY .ts file (segments)
            // This handles files like: stream_0.m3u8, stream_HDHub4u_Ms_-_hin.m3u8, segment_0_00001.ts
            playlistContent = playlistContent.replace(
                /([a-zA-Z0-9_\-\.]+\.(m3u8|ts))/g,
                (match: string) => {
                    // Don't add port if it already has query params
                    if (match.includes('?')) return match;
                    return `${match}?port=${portNum}`;
                }
            );

            // Set proper MIME type for HLS playlists (critical for mobile)
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            return res.status(200).send(playlistContent);

        } else {
            // For segments (.ts files), stream the binary data
            // Retry logic for segments
            let response;
            let retries = 3;
            while (retries > 0) {
                try {
                    response = await axios.get(upstreamUrl, {
                        responseType: 'stream',
                        timeout: 60000, // Increased to 60s for slow tunnels/encoding
                    });
                    break;
                } catch (e: any) {
                    retries--;
                    if (retries === 0) throw e;
                    console.warn(`[HLS Proxy] Retry ${3 - retries} for ${filePath}: ${e.message}`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            if (!response) throw new Error("Failed to fetch segment after retries");

            // Set proper MIME type for MPEG-TS segments (critical for mobile)
            res.setHeader('Content-Type', 'video/MP2T');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

            // Copy content length if available
            if (response.headers['content-length']) {
                res.setHeader('Content-Length', response.headers['content-length']);
            }

            // Stream the response
            response.data.pipe(res);
        }

    } catch (error: any) {
        console.error('[HLS Proxy] Error:', error.message);

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: 'Stream proxy not available',
                message: 'The stream proxy server is not running on the specified port'
            });
        }

        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Stream not found',
                message: 'The requested HLS segment or playlist does not exist'
            });
        }

        res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
}

// Disable body parsing for streaming
export const config = {
    api: {
        responseLimit: false,
    },
};
