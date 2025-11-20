import { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';
import logger from '@/utils/logger';

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
    radar: [
        {
            source: ['facebook.com/ads/library'],
            target: '/search/:query',
        },
    ],
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

    // Prepare Apify Actor input (based on actual working format)
    const actorInput = {
        count,
        scrapeAdDetails: false,
        'scrapePageAds.activeStatus': activeStatus,
        'scrapePageAds.countryCode': country,
        urls: [
            {
                url: searchUrl,
            },
        ],
        period: '',
    };

    // Start Apify Actor run
    const runResponse = await got({
        method: 'post',
        url: 'https://api.apify.com/v2/acts/XtaWFhbtfxyzqrFmd/runs',
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
                url: `https://api.apify.com/v2/acts/XtaWFhbtfxyzqrFmd/runs/${runId}`,
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

    // Debug: Log response structure
    if (ads.length > 0) {
        logger.info(`Meta Ad Library - Retrieved ${ads.length} ads for query: ${query}`);
        logger.info('Meta Ad Library - Sample ad fields:', Object.keys(ads[0]).join(', '));
        logger.debug('Meta Ad Library - Full sample ad:', JSON.stringify(ads[0], null, 2));
    }

    // Transform ads into RSS items
    const items = ads.map((ad) => {
        // Helper function to safely get nested properties
        const getNestedProp = (obj, path) => path.split('.').reduce((current, prop) => current?.[prop], obj);

        // Handle multiple possible field name variations from Apify
        // Try all common field names for ad content/text
        const adText = ad.adContent || ad.text || ad.body || ad.adText || ad.snippet || ad.adCreativeBody || ad.adCreativeBodies?.[0] || ad.creative?.body || '';

        // Try all common field names for advertiser/page name
        const advertiserName = ad.pageInfo?.pageName || ad.pageName || ad.advertiserName || ad.advertiser || ad.page || ad.pageData?.pageName || getNestedProp(ad, 'pageInfo.name') || '';

        // Try all common field names for ad ID
        const adId = ad.adArchiveID || ad.adId || ad.id || ad.archiveID || ad.libraryID || ad.adLibraryID || '';

        // Try all common field names for images
        const adImages = ad.images || ad.imageUrls || ad.adCreativeImages || ad.snapshot?.images || (ad.imageUrl ? [ad.imageUrl] : []) || ad.media || ad.adCreativeLinkCaption?.images || [];

        // Try all common field names for dates
        const adStartDate = ad.startDate || ad.start_date || ad.createdTime || ad.created_time || ad.adDeliveryStartTime || ad.publishedDate || '';

        // Try all common field names for platforms
        const adPlatforms = ad.platforms || (ad.platform ? [ad.platform] : []) || ad.publisherPlatform || [];

        // Try all common field names for CTA
        const adCTA = ad.ctaText || ad.cta || ad.ctaButton || ad.callToAction || ad.adCreativeLinkCaption?.callToActionType || '';

        // Try all common field names for URL
        const adUrl = ad.url || ad.adUrl || ad.link || ad.adSnapshotUrl || ad.snapshot?.link || '';

        // Build title from ad text (first 100 chars), fallback to advertiser name, then query
        let title = '';
        if (adText && adText.trim()) {
            // Take first 100 chars of ad text, clean it up
            title = adText.replaceAll(/\s+/g, ' ').trim().slice(0, 100);
            if (adText.length > 100) {
                title += '...';
            }
        } else if (advertiserName && advertiserName.trim()) {
            title = `Ad by ${advertiserName}`;
        } else {
            title = `Ad for ${query}`;
        }

        const link = adId ? `https://www.facebook.com/ads/library/?id=${adId}` : adUrl || searchUrl;

        // Build description with ad details
        let description = '';

        // Add ad images if available
        if (adImages && adImages.length > 0) {
            description += adImages.map((img) => `<img src="${img}" style="max-width:100%; margin:10px 0;">`).join('');
        }

        // Add ad content/text
        if (adText && adText.trim()) {
            description += `<p><strong>Ad Copy:</strong></p><p>${adText.replaceAll('\n', '<br>')}</p>`;
        }

        // Add page info
        if (advertiserName && advertiserName.trim()) {
            description += `<p><strong>Advertiser:</strong> ${advertiserName}</p>`;
        }

        // Add ad ID
        if (adId && adId.trim()) {
            description += `<p><strong>Ad Library ID:</strong> ${adId}</p>`;
        }

        // Add start date
        if (adStartDate && adStartDate.trim()) {
            description += `<p><strong>Started:</strong> ${adStartDate}</p>`;
        }

        // Add platforms
        if (adPlatforms && adPlatforms.length > 0) {
            description += `<p><strong>Platforms:</strong> ${adPlatforms.join(', ')}</p>`;
        }

        // Add CTA button if available
        if (adCTA && adCTA.trim()) {
            description += `<p><strong>CTA:</strong> ${adCTA}</p>`;
        }

        // If no meaningful content was extracted, show available fields for debugging
        if (!adText && !advertiserName && !adImages.length) {
            description += '<p><em>Note: Could not extract standard ad fields from response.</em></p>';
            description += `<p><strong>Available fields:</strong> ${Object.keys(ad).join(', ')}</p>`;
            description += `<details><summary>Show raw data</summary><pre>${JSON.stringify(ad, null, 2)}</pre></details>`;
        }

        return {
            title,
            link,
            description: description || 'No description available',
            pubDate: adStartDate ? parseDate(adStartDate) : new Date(),
            guid: adId || link,
            author: advertiserName || 'Unknown Advertiser',
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
