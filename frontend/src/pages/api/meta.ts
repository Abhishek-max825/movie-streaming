import type { NextApiRequest, NextApiResponse } from 'next';
import { getMeta } from '@backend/meta';
import { createProviderContext } from '@backend/provider-context';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    const { link } = req.query;

    if (!link || typeof link !== 'string') {
        return res.status(400).json({ error: 'Query parameter "link" is required' });
    }

    try {
        const context = createProviderContext();

        const meta = await getMeta({
            link: link,
            providerContext: context,
        });

        res.status(200).json(meta);
    } catch (error: any) {
        console.error('Meta API Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
