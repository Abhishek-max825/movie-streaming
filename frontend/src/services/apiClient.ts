import axios from 'axios';
import type { Post, Info, Stream } from '@/types/api';

const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const searchContent = async (q: string, page = 1): Promise<Post[]> => {
    const { data } = await apiClient.get('/search', { params: { q, page } });
    return data;
};

export const getMeta = async (link: string): Promise<Info> => {
    const { data } = await apiClient.get('/meta', { params: { link } });
    return data;
};

export const startStream = async (link: string, type: string = 'movie') => {
    const { data } = await apiClient.post('/stream', { link, type });
    return data;
};

export const stopStream = async (port: number) => {
    try {
        console.log(`[apiClient] Signaling shutdown for port ${port}...`);
        // Use fetch with keepalive: true to ensure the request survives page unmount/navigation
        await fetch('/api/stop-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ port }),
            keepalive: true
        });
    } catch (err) {
        console.error('Failed to stop stream', err);
    }
};

export default apiClient;
