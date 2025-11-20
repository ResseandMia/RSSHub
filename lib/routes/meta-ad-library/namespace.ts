import type { Namespace } from '@/types';

export const namespace: Namespace = {
    name: 'Meta Ad Library',
    url: 'facebook.com/ads/library',
    description: `Meta Ad Library RSS feeds for tracking competitor ads.

This route uses Apify to scrape Meta's Ad Library and convert it to RSS format.

**Configuration Required:**

Set the following environment variable in your RSSHub configuration:

\`\`\`
APIFY_TOKEN=your_apify_api_token
\`\`\`

**Features:**
- Track competitor ads by keyword or page name
- Monitor new ads from specific advertisers
- Get notifications when new ads appear
- Filter by country, ad type, and status`,
    lang: 'en',
};
