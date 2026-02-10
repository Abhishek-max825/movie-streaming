import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { getStream } from '@backend/stream';
import { createProviderContext } from '@backend/provider-context';

// Global registries to store active proxies and ongoing startups
// Using 'any' for registries to avoid complex TS global mapping in this environment
const proxyRegistry: Record<string, any> = (global as any).proxyRegistry || {};
const initRegistry: Record<string, Promise<any> | undefined> = (global as any).initRegistry || {};
(global as any).proxyRegistry = proxyRegistry;
(global as any).initRegistry = initRegistry;

// Clean up child processes when the server stops (mostly for dev mode)
if (!(global as any).hasRegisteredCleanup) {
    (global as any).hasRegisteredCleanup = true;
    const cleanup = () => {
        console.log('[Stream API] Server stopping, killing all proxies...');
        Object.values(proxyRegistry).forEach((proxy: any) => {
            if (proxy.process) {
                try {
                    proxy.process.kill();
                } catch (e) { }
            }
        });
    };

    // Handle various exit signals
    ['exit', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach((eventType) => {
        process.on(eventType, cleanup);
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { link, type = 'movie' } = req.body;

    if (!link) {
        return res.status(400).json({ error: 'Link is required' });
    }

    try {
        const context = createProviderContext();
        const controller = new AbortController();

        const streams = await getStream({
            link,
            type,
            signal: controller.signal,
            providerContext: context,
        });

        if (!streams || streams.length === 0) {
            return res.status(404).json({ error: 'No streams found' });
        }

        const streamUrl = streams[0].url;
        const cleanUrl = streamUrl;

        // 1. Check if already bound (Active Re-use)
        if (proxyRegistry[cleanUrl]) {
            console.log(`♻️ RE-USE: Using existing proxy for ${cleanUrl.substring(0, 50)}... on port ${proxyRegistry[cleanUrl].port}`);
            proxyRegistry[cleanUrl].users += 1;

            return res.status(200).json({
                streamUrl,
                proxyUrl: `/api/hls/stream.m3u8?port=${proxyRegistry[cleanUrl].port}`,
                duration: proxyRegistry[cleanUrl].duration,
                headers: {}
            });
        }

        // 2. Check if already INITIALIZING (Concurrency Lock)
        if (initRegistry[cleanUrl]) {
            console.log(`⏳ WAIT: A proxy for this stream is already starting. Waiting...`);
            try {
                const data = await initRegistry[cleanUrl];
                // After waiting, if successful, the registry will have been updated by the initiator
                if (proxyRegistry[cleanUrl]) {
                    proxyRegistry[cleanUrl].users += 1;
                    console.log(`✅ WAIT DONE: Joined existing proxy on port ${proxyRegistry[cleanUrl].port}`);
                    return res.status(200).json(data);
                }
            } catch (waitError) {
                console.error(`❌ Wait failed: proxy failed to start for other user. Retrying spawn...`);
            }
        }

        // 3. Initiate Startup (Winner of the race)
        const startupPromise = (async () => {
            // Check it's a ZIP file
            const isZip = cleanUrl.toLowerCase().includes('.zip');
            let zipFile = '';

            if (isZip) {
                const zipHelperScript = path.resolve(process.cwd(), '../src/python/zip_helper.py');
                const listProcess = spawnSync('python', [zipHelperScript, 'list', '--url', cleanUrl], { encoding: 'utf-8' });
                if (!listProcess.error) {
                    try {
                        const videoFiles = JSON.parse(listProcess.stdout);
                        if (videoFiles.length > 0) zipFile = videoFiles[0];
                    } catch (e) { }
                }
            }

            const proxyScript = path.resolve(process.cwd(), '../src/python/stream_proxy.py');
            const basePort = 8000;
            const spawnArgs: string[] = [proxyScript, '--url', cleanUrl, '--port', basePort.toString(), '--host', '0.0.0.0'];
            if (isZip && zipFile) spawnArgs.push('--zip-file', zipFile);

            console.log('🚀 SPAWNING Proxy:', spawnArgs);
            const pythonProcess = spawn('python', spawnArgs);

            return new Promise<any>((resolve, reject) => {
                let proxyPort = 0;
                let detectedDuration: number | undefined = undefined;
                let isReady = false;

                const timeout = setTimeout(() => {
                    delete initRegistry[cleanUrl];
                    reject(new Error('Proxy startup timed out (120s)'));
                }, 120000);

                if (pythonProcess.stdout) {
                    pythonProcess.stdout.on('data', (data) => {
                        const lines = data.toString().split('\n');
                        for (const line of lines) {
                            try {
                                if (line.trim().startsWith('{')) {
                                    const event = JSON.parse(line.trim());
                                    if (event.event === 'bound') {
                                        proxyPort = event.port;
                                        detectedDuration = event.duration;
                                        console.log(`✅ BOUND: Port ${proxyPort}`);

                                        proxyRegistry[cleanUrl] = {
                                            port: proxyPort,
                                            duration: detectedDuration,
                                            users: 1,
                                            process: pythonProcess, // Store process ref for cleanup
                                            lastAccessed: Date.now()
                                        };

                                        clearTimeout(timeout);
                                        isReady = true;
                                        delete initRegistry[cleanUrl];

                                        resolve({
                                            streamUrl,
                                            proxyUrl: `/api/hls/stream.m3u8?port=${proxyPort}`,
                                            duration: detectedDuration,
                                            headers: {}
                                        });
                                    }
                                }
                            } catch (e) { }
                        }
                    });
                }

                pythonProcess.on('error', (err) => {
                    clearTimeout(timeout);
                    delete initRegistry[cleanUrl];
                    reject(err);
                });

                pythonProcess.on('exit', (code) => {
                    if (!isReady) {
                        clearTimeout(timeout);
                        delete initRegistry[cleanUrl];
                        reject(new Error(`Proxy exited early with code ${code}`));
                    }
                });

                pythonProcess.unref();
            });
        })();

        initRegistry[cleanUrl] = startupPromise;
        const resultData = await startupPromise;
        return res.status(200).json(resultData);

    } catch (error: any) {
        console.error('Stream API Error:', error.message);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
