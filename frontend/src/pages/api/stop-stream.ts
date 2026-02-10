import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Re-use the global registry from stream.ts
const proxyRegistry: any = (global as any).proxyRegistry || {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { port } = req.body;

    if (!port) {
        return res.status(400).json({ error: 'Port is required' });
    }

    try {
        // Find the stream URL associated with this port in the registry
        const registryEntry = Object.entries(proxyRegistry).find(
            ([_, info]: [string, any]) => info.port === parseInt(port)
        );

        if (registryEntry) {
            const [url, info]: [string, any] = registryEntry;
            info.users -= 1;
            console.log(`[Stop Stream] User leave for port ${port}. Remaining users for this stream: ${info.users}`);

            // Only kill if no users are left
            if (info.users <= 0) {
                console.log(`[Stop Stream] Last user left. Triggering force shutdown for port ${port}...`);

                // 1. Terminate the process directly if we have the reference (Most reliable)
                if (info.process && typeof info.process.kill === 'function') {
                    try {
                        console.log(`[Stop Stream] 🔪 Killing process for port ${port} (PID: ${info.process.pid})...`);
                        info.process.kill('SIGKILL'); // Force kill
                    } catch (killError) {
                        console.warn(`[Stop Stream] Process kill failed:`, killError);
                    }
                }

                // 2. Cleanup registry immediately
                delete proxyRegistry[url];
                console.log(`[Stop Stream] Registry cleared for port ${port}.`);

                // 3. Optional: Try HTTP shutdown as backup/cleanup if process was missing (rare)
                // We ignore errors here because we likely just killed it.
                const proxyUrl = `http://127.0.0.1:${port}/shutdown`;
                try {
                    await axios.post(proxyUrl, {}, { timeout: 1000 }).catch(() => { });
                } catch (e) { }
            } else {
                console.log(`[Stop Stream] Keeping proxy on port ${port} active for ${info.users} other users.`);
            }
        } else {
            // Fallback for untracked ports (direct shutdown attempt)
            console.log(`[Stop Stream] Port ${port} not found in registry. Attempting direct shutdown...`);
            const proxyUrl = `http://127.0.0.1:${port}/shutdown`;
            // Suppress errors - if it fails, it's likely already dead
            await axios.post(proxyUrl, {}, { timeout: 2000 }).catch(() => {
                console.log(`[Stop Stream] Shutdown request to port ${port} failed or timed out (Process likely dead).`);
            });
        }

        // Always return success to the client if we've done our best
        res.status(200).json({ message: 'Stop sequence processed' });
    } catch (error: any) {
        // Suppress generic errors too, just log them
        console.error(`[Stop Stream] Error finishing sequence for port ${port}:`, error.message);
        res.status(200).json({ message: 'Stop sequence processed' });
    }
}
