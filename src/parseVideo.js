import { config } from "./config.js";
import { pool } from "./browserPool.js";
import * as cache from "./cache.js";

export async function parseDouyinLink(shareUrl) {
  const cached = cache.get(shareUrl);
  if (cached) return cached;

  const { browser } = await pool.acquire();
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (["image", "stylesheet", "font", "media"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; SM-S9080) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.6367.83 Mobile Safari/537.36"
    );

    await page.goto(shareUrl, {
      waitUntil: config.navigation.waitUntil,
      timeout: config.navigation.timeout,
    });

    try {
      await page.waitForSelector("video", { timeout: 10000 });
    } catch (_) {}

    const data = await page.evaluate(() => {
      const extract = {};

      // 策略 A: SSR 数据
      try {
        const scripts = document.querySelectorAll("script");
        for (const s of scripts) {
          const text = s.textContent || "";
          if (text.includes("_SSR_HYDRATED_DATA")) {
            const match = text.match(/_SSR_HYDRATED_DATA\s*=\s*(\{.+?\});/);
            if (match) {
              const parsed = JSON.parse(match[1]);
              const aweme = parsed?.__INITIAL_STATE__?.awemeDetail;
              if (aweme) {
                extract.title = aweme.desc;
                extract.like = aweme.statistics?.digg_count;
                extract.comment = aweme.statistics?.comment_count;
                extract.collect = aweme.statistics?.collect_count;
                extract.createTime = aweme.createTime;
                const vid = aweme.video;
                if (vid) {
                  const playLinks = vid.play_addr?.url_list;
                  if (playLinks) extract.videoUrls = playLinks[0];
                  const coverList = vid.cover?.url_list;
                  if (coverList) extract.coverUrls = coverList[0];
                }
              }
            }
          }
        }
      } catch (_) {}

      if (extract.videoUrls) return extract;

      // 策略 B: OG 标签
      const ogVideo = document.querySelector('meta[property="og:video"]')?.content;
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
      if (ogVideo) {
        extract.videoUrls = ogVideo;
        extract.title = ogTitle || "";
        const ogImage = document.querySelector('meta[property="og:image"]')?.content;
        if (ogImage) extract.coverUrls = ogImage;
        return extract;
      }

      // 策略 C: video 标签
      const videoEl = document.querySelector("video source") || document.querySelector("video");
      if (videoEl) {
        extract.videoUrls = videoEl.src || videoEl.querySelector("source")?.src;
        return extract;
      }

      return null;
    });

    if (!data || !data.videoUrls) {
      throw new Error("未能从页面提取到视频地址，页面结构可能有变化");
    }

    const result = {
      status: true,
      data: {
        title: data.title || "抖音视频",
        coverUrls: data.coverUrls || "",
        videoUrls: data.videoUrls,
        isVideo: true,
        like: data.like || 0,
        comment: data.comment || 0,
        collect: data.collect || 0,
        createTime: data.createTime || "",
        leftTimes: 7200,
        usageTimes: 0,
      },
    };

    cache.set(shareUrl, result);
    return result;

  } catch (err) {
    return {
      status: false,
      error: err.message || "解析失败",
    };
  } finally {
    await page.close();
    pool.release(browser);
  }
}
