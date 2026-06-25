import { buildGoogleUrl } from "./types";

export type SocialLinkEntry = { title: string; url: string };

/**
 * Nick zwykle bez @, litery/cyfry/kropka/myślnik/podkreślenie (typowe loginy).
 * Nie pobieramy danych z sieci — tylko składamy adresy URL do otwarcia w przeglądarce.
 */
export function sanitizeHandle(input: string): string | null {
  const s = input.trim().replace(/^@+/, "");
  if (!s) return null;
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(s)) return null;
  return s;
}

function encQ(s: string): string {
  return encodeURIComponent(s);
}

/**
 * Gotowe linki: profile, wyszukiwarki w serwisie oraz zapytania Google site:…
 * (użytkownik sam otwiera strony — brak automatycznego scrapowania API).
 */
export function buildSocialPlatformLinks(handle: string): SocialLinkEntry[] {
  const h = sanitizeHandle(handle);
  if (!h) return [];

  const q = encQ(h);
  const entries: SocialLinkEntry[] = [];

  const add = (title: string, url: string) => entries.push({ title, url });

  add("GitHub — profil", `https://github.com/${h}`);
  add("GitHub — szukaj użytkowników", `https://github.com/search?q=${q}&type=users`);
  add("GitHub — repozytoria", `https://github.com/search?q=${q}&type=repositories`);

  add("Reddit — /user/", `https://www.reddit.com/user/${h}/`);
  add("Reddit — szukaj", `https://www.reddit.com/search/?q=${q}`);

  add("X (Twitter)", `https://x.com/${h}`);
  add("X/Twitter — Google", buildGoogleUrl(`site:x.com OR site:twitter.com "${h}"`));

  add("Instagram", `https://www.instagram.com/${h}/`);
  add("TikTok", `https://www.tiktok.com/@${h}`);
  add("YouTube @", `https://www.youtube.com/@${h}`);
  add("Facebook", `https://www.facebook.com/${h}`);
  add("Threads", `https://www.threads.net/@${h}`);

  add("LinkedIn — Google", buildGoogleUrl(`site:linkedin.com/in "${h}"`));
  add("Medium", `https://medium.com/@${h}`);
  add("dev.to", `https://dev.to/${h}`);

  add("Hacker News — user", `https://news.ycombinator.com/user?id=${h}`);
  add("GitLab — profil", `https://gitlab.com/${h}`);
  add("Keybase", `https://keybase.io/${h}`);
  add("Twitch", `https://www.twitch.tv/${h}`);

  add("Pinterest", `https://www.pinterest.com/${h}/`);
  add("Patreon", `https://www.patreon.com/${h}/`);
  add("Bluesky — Google", buildGoogleUrl(`site:bsky.app "${h}"`));
  add("Stack Overflow — Google", buildGoogleUrl(`site:stackoverflow.com "${h}"`));
  add("Mastodon — Google", buildGoogleUrl(`mastodon "${h}"`));

  return entries;
}
