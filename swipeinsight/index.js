const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const baseUrl = 'https://web.swipeinsight.app';
    const targetUrl = `${baseUrl}/app/for-you`;
    
    try {
        // 发送请求抓取网页
        const response = await got({
            method: 'get',
            url: targetUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': baseUrl
            }
        });

        const $ = cheerio.load(response.data);
        const items = [];
        
        // 根据你的截图，选择所有带 class="article" 的 div
        $('div.article').each((index, element) => {
            const $article = $(element);
            
            // 获取文章 ID
            const articleId = $article.attr('data-article-id');
            
            // 查找标题（在 h2 标签的 a 链接中）
            const $titleLink = $article.find('h2 a');
            const title = $titleLink.text().trim();
            const linkHref = $titleLink.attr('href');
            
            // 构建完整链接
            let fullLink = '';
            if (linkHref) {
                fullLink = linkHref.startsWith('http') ? linkHref : baseUrl + linkHref;
            }
            
            // 查找描述文本（在 section 中的 p 标签）
            const description = $article.find('section p').text().trim();
            
            // 查找图片（如果有）
            const $img = $article.find('img');
            let imageUrl = '';
            if ($img.length > 0) {
                imageUrl = $img.attr('src');
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = baseUrl + imageUrl;
                }
            }
            
            // 只添加有标题和链接的文章
            if (title && fullLink) {
                // 构建富文本描述
                let richDescription = description || '无描述';
                if (imageUrl) {
                    richDescription = `<img src="${imageUrl}" style="max-width:100%;height:auto;"><br><br>${richDescription}`;
                }
                
                items.push({
                    title: title,
                    link: fullLink,
                    description: richDescription,
                    pubDate: new Date().toUTCString(),
                    guid: articleId || fullLink,
                    author: 'SwipeInsight'
                });
            }
        });

        // 返回 RSS Feed 数据
        ctx.state.data = {
            title: 'SwipeInsight - For You 推荐',
            link: targetUrl,
            description: 'SwipeInsight 每日精选内容订阅',
            item: items,
            language: 'zh-cn',
            image: `${baseUrl}/images/swipe-insight-og-image.webp`
        };
        
    } catch (error) {
        ctx.throw(500, `抓取 SwipeInsight 失败: ${error.message}`);
    }
};
