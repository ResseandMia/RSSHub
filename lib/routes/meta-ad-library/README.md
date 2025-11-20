# Meta Ad Library RSS Feed

Convert Meta (Facebook) Ad Library searches into RSS feeds for tracking competitor ads.

## Features

- 🔍 **Keyword Search**: Track ads by search query
- 🌍 **Country Filtering**: Filter ads by target country
- 📊 **Ad Status**: Filter by active, inactive, or all ads
- 🔔 **Auto-Notifications**: Get RSS notifications when new ads appear
- 🖼️ **Rich Content**: Includes ad images, copy, CTA, and metadata

## Prerequisites

1. **Apify API Token**: Sign up at [apify.com](https://apify.com) and get your API token
2. Set the environment variable in your RSSHub configuration:
   ```bash
   APIFY_TOKEN=your_apify_api_token_here
   ```

## Routes

### Search by Keyword

```
/meta-ad-library/search/:query
```

#### Parameters

- **query** (required): The search term/keyword (e.g., "Bug MD", "Nike", "Shopify")

#### Query Parameters

| Parameter | Description | Default | Options |
|-----------|-------------|---------|---------|
| `country` | Target country code | `US` | Any 2-letter country code (US, CA, GB, etc.) |
| `ad_type` | Type of ads to fetch | `all` | `all`, `political`, `housing`, `credit`, `employment` |
| `active_status` | Ad activity status | `active` | `active`, `inactive`, `all` |
| `count` | Number of ads to fetch | `30` | Any number (e.g., 50, 100) |

## Examples

### Basic Search - Bug MD Ads in US
```
https://your-rsshub-domain.com/meta-ad-library/search/Bug%20MD
```

### Advanced - Nike Ads in Canada, 50 Results
```
https://your-rsshub-domain.com/meta-ad-library/search/Nike?country=CA&count=50
```

### Track All Ads (Active + Inactive)
```
https://your-rsshub-domain.com/meta-ad-library/search/Shopify?active_status=all
```

## Use Cases

### 1. **Competitor Ad Tracking**
Monitor competitor ad campaigns by setting up RSS feeds for their brand names or products.

### 2. **Market Research**
Track industry trends by subscribing to keyword-based ad feeds.

### 3. **Ad Inspiration**
Get inspiration for your own campaigns by tracking successful advertisers.

### 4. **Automated Reporting**
Feed RSS data into Slack, Discord, or Google Sheets for automated reports.

## RSS Feed Output

Each RSS item includes:

- **Title**: Ad copy headline or advertiser name
- **Link**: Direct link to the ad in Facebook Ad Library
- **Description**: HTML-formatted content including:
  - Ad images/creatives
  - Full ad copy text
  - Advertiser/page name
  - Start date
  - Platforms (Facebook, Instagram, Messenger, etc.)
  - Call-to-action button text
- **Publication Date**: When the ad started running
- **Author**: Advertiser name

## Pricing

This route uses the Apify "curious_coder/facebook-ads-library-scraper" actor, which costs approximately **$0.75 per 1,000 ads scraped**. Each RSS request will incur Apify usage charges.

## Workflow Example

### Weekly Competitor Ad Tracking

1. **Setup**: Add RSS feed to your reader:
   ```
   /meta-ad-library/search/Competitor%20Brand?count=50
   ```

2. **Automation**: Connect to Zapier/Make.com to:
   - Save new ads to Google Sheets
   - Post notifications to Slack
   - Archive ad creatives to cloud storage

3. **Analysis**: Monthly review with Claude AI to identify:
   - Common ad angles
   - Creative trends
   - Messaging patterns
   - Seasonal changes

## Troubleshooting

### Error: "Meta Ad Library RSS requires Apify API token"

Make sure you've set the `APIFY_TOKEN` environment variable in your RSSHub configuration.

### Empty Feed

- Check if the search term has active ads on [Facebook Ad Library](https://www.facebook.com/ads/library/)
- Try using `active_status=all` to include inactive ads
- Increase the `count` parameter

### Timeout Errors

The route waits up to 60 seconds for Apify to scrape results. If you're fetching a large number of ads, consider breaking them into smaller requests.

## Technical Details

- **Scraping Method**: Uses Apify Actor for reliable, proxy-rotated scraping
- **Update Frequency**: Real-time (fetches fresh data on each RSS request)
- **Rate Limiting**: Depends on your Apify subscription tier
- **Cache**: Follows RSSHub's default caching strategy

## Related Links

- [Meta Ad Library](https://www.facebook.com/ads/library/)
- [Apify Platform](https://apify.com)
- [curious_coder/facebook-ads-library-scraper Actor](https://apify.com/curious_coder/facebook-ads-library-scraper)

## Maintainer

[@ResseandMia](https://github.com/ResseandMia)
