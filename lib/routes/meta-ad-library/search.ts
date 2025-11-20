import { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';

export const route: Route = {
    path: '/search/:query',
    categories: ['social-media'],
    example: '/meta-ad-library/search/Bug MD',
    parameters: {
        query: 'Search keyword or brand name',
    },
    features: {
        requireConfig: [
            {
                name: 'APIFY_TOKEN',
                description: 'Apify API token is required. Sign up at apify.com to get your token.',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'Meta Ad Library Search',
    maintainers: ['ResseandMia'],
    handler,
    description: `Track competitor Facebook/Instagram ads via Meta's Ad Library.

Query parameters:
- \`country\`: Target country code (default: US)
- \`ad_type\`: Type of ads (default: all)
- \`active_status\`: active/inactive/all (default: active)
- \`count\`: Number of ads to fetch (default: 30)

Example: \`/meta-ad-library/search/Nike?country=CA&count=50\``,
};

async function handler(ctx) {
    const query = ctx.req.param('query');
    const country = ctx.req.query('country') || 'US';
    const adType = ctx.req.query('ad_type') || 'all';
    const activeStatus = ctx.req.query('active_status') || 'active';
    const count = Number.parseInt(ctx.req.query('count') || '30', 10);

    // Get Apify token from config
    const apifyToken = config.apify?.token;
    if (!apifyToken) {
        throw new ConfigNotFoundError('Meta Ad Library RSS requires Apify API token. Please configure APIFY_TOKEN in your environment variables.');
    }

    // Construct Facebook Ad Library search URL
    const searchUrl = `https://www.facebook.com/ads/library/?active_status=${activeStatus}&ad_type=${adType}&country=${country}&q=${encodeURIComponent(query)}&search_type=keyword_unordered&media_type=all`;

    // Prepare Apify Actor input
    const actorInput = {
        action: 'scrapeSearchResults',
        searchUrl,
        count,
    };

    // Start Apify Actor run
    const runResponse = await got({
        method: 'post',
        url: 'https://api.apify.com/v2/acts/curious_coder~facebook-ads-library-scraper/runs',
        searchParams: {
            token: apifyToken,
        },
        json: actorInput,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const runId = runResponse.data.data.id;
    const defaultDatasetId = runResponse.data.data.defaultDatasetId;

    // Poll for run completion (max 60 seconds)
    const pollForCompletion = async () => {
        const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Wait 2 seconds before checking status
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => {
                setTimeout(resolve, 2000);
            });

            // eslint-disable-next-line no-await-in-loop
            const statusResponse = await got({
                method: 'get',
                url: `https://api.apify.com/v2/acts/curious_coder~facebook-ads-library-scraper/runs/${runId}`,
                searchParams: {
                    token: apifyToken,
                },
            });

            const runStatus = statusResponse.data.data.status;

            if (runStatus === 'SUCCEEDED') {
                return true;
            } else if (runStatus === 'FAILED' || runStatus === 'ABORTED' || runStatus === 'TIMED-OUT') {
                throw new Error(`Apify Actor run failed with status: ${runStatus}`);
            }
            // If still RUNNING, continue loop
        }

        throw new Error('Apify Actor run timed out after 60 seconds');
    };

    await pollForCompletion();

    // Fetch results from dataset
    const datasetResponse = await got({
        method: 'get',
        url: `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
        searchParams: {
            token: apifyToken,
        },
    });

    const ads = datasetResponse.data;

    // Transform ads into RSS items
    const items = ads.map((ad) => {
        const title = ad.adContent || ad.pageInfo?.pageName || 'Untitled Ad';
        const link = ad.adArchiveID ? `https://www.facebook.com/ads/library/?id=${ad.adArchiveID}` : ad.url || searchUrl;

        // Build description with ad details
        let description = '';

        // Add ad images if available
        if (ad.images && ad.images.length > 0) {
            description += ad.images.map((img) => `<img src="${img}" style="max-width:100%; margin:10px 0;">`).join('');
        }

        // Add ad content/text
        if (ad.adContent) {
            description += `<p><strong>Ad Copy:</strong></p><p>${ad.adContent.replaceAll('\n', '<br>')}</p>`;
        }

        // Add page info
        if (ad.pageInfo?.pageName) {
            description += `<p><strong>Advertiser:</strong> ${ad.pageInfo.pageName}</p>`;
        }

        // Add start date
        if (ad.startDate) {
            description += `<p><strong>Started:</strong> ${ad.startDate}</p>`;
        }

        // Add platforms
        if (ad.platforms && ad.platforms.length > 0) {
            description += `<p><strong>Platforms:</strong> ${ad.platforms.join(', ')}</p>`;
        }

        // Add CTA button if available
        if (ad.ctaText) {
            description += `<p><strong>CTA:</strong> ${ad.ctaText}</p>`;
        }

        return {
            title,
            link,
            description: description || 'No description available',
            pubDate: ad.startDate ? parseDate(ad.startDate) : new Date(),
            guid: ad.adArchiveID || link,
            author: ad.pageInfo?.pageName || 'Unknown Advertiser',
        };
    });

    return {
        title: `Meta Ad Library - ${query}`,
        link: searchUrl,
        description: `Facebook/Instagram ads for search query: ${query} in ${country}`,
        item: items,
        allowEmpty: true,
    };
}
