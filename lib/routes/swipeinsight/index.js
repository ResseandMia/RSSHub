const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const baseUrl = 'https://web.swipeinsight.app';
    const targetUrl = `${baseUrl}/app/for-you`;
    
    const response = await got({
        method: 'get',
        url: targetUrl,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });

    const $ = cheerio.load(response.data);
    const items = [];
    
    $('div.article').each((index, element) => {
        const $article = $(element);
        const articleId = $article.attr('data-article-id');
        
        const $titleLink = $article.find('h2 a');
        const title = $titleLink.text().trim();
        const linkHref = $titleLink.attr('href');
        
        let fullLink = '';
        if (linkHref) {
            fullLink = linkHref.startsWith('http') ? linkHref : baseUrl + linkHref;
        }
        
        const description = $article.find('section p').text().trim();
        
        const $img = $article.find('img');
        let imageUrl = '';
        if ($img.length > 0) {
            imageUrl = $img.attr('src');
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = baseUrl + imageUrl;
            }
        }
        
        if (title && fullLink) {
            let richDescription = description || '无描述';
            if (imageUrl) {
                richDescription = `<img src="${imageUrl}" style="max-width:100%;"><br><br>${richDescription}`;
            }
            
            items.push({
                title: title,
                link: fullLink,
                description: richDescription,
                pubDate: new Date().toUTCString(),
                guid: articleId || fullLink,
            });
        }
    });

    ctx.state.data = {
        title: 'SwipeInsight - For You',
        link: targetUrl,
        description: 'SwipeInsight 每日精选内容',
        item: items,
    };
};
