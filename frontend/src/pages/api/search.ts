import type { NextApiRequest, NextApiResponse } from 'next';
import { getSearchPosts } from '@backend/posts';
import { createProviderContext } from '@backend/provider-context';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { q, page = '1' } = req.query;

    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const context = createProviderContext();
        const controller = new AbortController();

        const results = await getSearchPosts({
            searchQuery: q,
            page: Number(page),
            providerValue: 'hdhub',
            providerContext: context,
            signal: controller.signal,
        });

        res.status(200).json(results);
    } catch (error: any) {
        console.error('Search API Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
