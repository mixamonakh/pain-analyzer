import Parser from 'rss-parser';
import axios from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

const USER_AGENT = 'Mozilla/5.0 (compatible; PainAnalyzer/1.0)';

export interface RSSItem {
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  description?: string;
  isoDate?: string;
  pubDate?: string;
}

export async function fetchRSSFeed(
  feedUrl: string,
  timeoutMs: number = 15000,
  proxyUrl?: string
): Promise<RSSItem[]> {
  const parser = new Parser({ timeout: timeoutMs });

  const axiosInstance = axios.create({
    timeout: timeoutMs,
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (proxyUrl) {
    const isHttps = proxyUrl.startsWith('https');
    const agent = isHttps
      ? new HttpsProxyAgent(proxyUrl)
      : new HttpProxyAgent(proxyUrl);
    axiosInstance.defaults.httpAgent = agent;
    axiosInstance.defaults.httpsAgent = agent;
  }

  // Используем axios напрямую вместо parser.fetchUrl
  try {
    const response = await axiosInstance.get(feedUrl);
    const feed = await parser.parseString(response.data);
    return (feed.items || []) as RSSItem[];
  } catch (error) {
    throw new Error(`Failed to fetch RSS feed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function fetchRSSFeedWithRetry(
  feedUrl: string,
  timeoutMs: number = 15000,
  delayMs: number = 0,
  proxyUrl?: string
): Promise<RSSItem[]> {
  const delays = [0, 2000, 5000];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (delayMs > 0 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt] || 5000));
      }

      return await fetchRSSFeed(feedUrl, timeoutMs, proxyUrl);
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error('Unexpected end of retry loop');
}
