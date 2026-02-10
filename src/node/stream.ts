import { ProviderContext } from "./types";

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const {
    axios,
    cheerio,
    extractors,
    commonHeaders: headers,
    getBaseUrl
  } = providerContext;
  const { hubcloudExtracter } = extractors;

  // Ensure absolute URL
  if (link.startsWith("/")) {
    const baseUrl = await getBaseUrl("hdhub");
    link = `${baseUrl}${link}`;
  }

  // If link is already a hubcdn/hubcloud link, pass directly to extractor
  if (link.includes("hubcdn.fans") || link.includes("hubcloud")) {
    console.log("🔗 Direct hubcdn/hubcloud link, passing to extractor...");
    try {
      const streams = await hubcloudExtracter(link, signal);
      if (streams.length === 0) {
        console.log("❌ Stream URL is invalid or unavailable");
        throw new Error("Video file is no longer available. The content may have been deleted or is temporarily unavailable.");
      }
      return streams;
    } catch (error: any) {
      console.log("hd hub 4 getStream error: ", error);
      if (error.message && error.message.includes("no longer available")) {
        throw error;
      }
      return [];
    }
  }

  // Check if it's already a direct video URL
  const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.flv', '.wmv', '.webm', '.m3u8'];
  const isDirectVideo = videoExtensions.some(ext => link.toLowerCase().includes(ext));

  if (isDirectVideo) {
    console.log("🎬 Direct video URL detected, returning as-is...");
    return [{ url: link, quality: "Direct", headers: {} }];
  }

  let hubdriveLink = "";
  if (link.includes("hubdrive")) {
    const hubdriveRes = await axios.get(link, { headers, signal });
    const hubdriveText = hubdriveRes.data;
    const $ = cheerio.load(hubdriveText);
    hubdriveLink =
      $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || link;
  } else {
    const res = await axios.get(link, { headers, signal });
    const text = res.data;
    const encryptedString = text.split("s('o','")?.[1]?.split("',180")?.[0];

    if (!encryptedString) {
      console.log("⚠️  Could not find encrypted string in response");
      throw new Error("No encrypted string found");
    }

    const decodedString: any = decodeString(encryptedString);

    if (!decodedString) {
      console.log("❌ Failed to decode string, trying alternative extraction...");
      throw new Error("Failed to decode encrypted string");
    }

    link = atob(decodedString?.o);
    const redirectLink = await getRedirectLinks(link, signal, headers);
    const redirectLinkRes = await axios.get(redirectLink, { headers, signal });
    const redirectLinkText = redirectLinkRes.data;
    const $ = cheerio.load(redirectLinkText);
    hubdriveLink =
      $('h3:contains("1080p")').find("a").attr("href") ||
      redirectLinkText.match(
        /href="(https:\/\/hubcloud\.[^\/]+\/drive\/[^"]+)"/
      )[1];
    if (hubdriveLink.includes("hubdrive")) {
      const hubdriveRes = await axios.get(hubdriveLink, { headers, signal });
      const hubdriveText = hubdriveRes.data;
      const $$ = cheerio.load(hubdriveText);
      hubdriveLink =
        $$(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") ||
        hubdriveLink;
    }
  }
  const hubdriveLinkRes = await axios.get(hubdriveLink, { headers, signal });
  const hubcloudText = hubdriveLinkRes.data;
  const hubcloudLink =
    hubcloudText.match(
      /<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i
    )?.[1] || hubdriveLink;
  try {
    const streams = await hubcloudExtracter(hubcloudLink, signal);
    if (streams.length === 0) {
      console.log("❌ All stream URLs were invalid or unavailable");
      throw new Error("Video file is no longer available. The content may have been deleted or is temporarily unavailable. Please try searching for another version or a different movie.");
    }
    return streams;
  } catch (error: any) {
    console.log("hd hub 4 getStream error: ", error);
    if (error.message && error.message.includes("no longer available")) {
      throw error;
    }
    return [];
  }
}

const encode = function (value: string) {
  return btoa(value.toString());
};
const decode = function (value: string) {
  if (value === undefined) {
    return "";
  }
  return atob(value.toString());
};
const pen = function (value: string) {
  return value.replace(/[a-zA-Z]/g, function (_0x1a470e: any) {
    return String.fromCharCode(
      (_0x1a470e <= "Z" ? 90 : 122) >=
        (_0x1a470e = _0x1a470e.charCodeAt(0) + 13)
        ? _0x1a470e
        : _0x1a470e - 26
    );
  });
};

const abortableTimeout = (
  ms: number,
  { signal }: { signal?: AbortSignal } = {}
) => {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      return reject(new Error("Aborted"));
    }

    const timer = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Aborted"));
      });
    }
  });
};

export async function getRedirectLinks(
  link: string,
  signal: AbortSignal,
  headers: any
) {
  try {
    const res = await fetch(link, { headers, signal });
    const resText = await res.text();

    var regex = /ck\('_wp_http_\d+','([^']+)'/g;
    var combinedString = "";

    var match;
    while ((match = regex.exec(resText)) !== null) {
      combinedString += match[1];
    }
    const decodedString = decode(pen(decode(decode(combinedString))));
    const data = JSON.parse(decodedString);
    console.log(data);
    const token = encode(data?.data);
    const blogLink = data?.wp_http1 + "?re=" + token;
    // Optimized: Reduce wait time. Most modern mirrors don't strictly enforce the full timer
    // if the token is generated. 2 seconds is usually enough for the session to be valid.
    let wait = abortableTimeout(2000, {
      signal,
    });

    await wait;
    console.log("blogLink", blogLink);

    let vcloudLink = "Invalid Request";
    while (vcloudLink.includes("Invalid Request")) {
      const blogRes = await fetch(blogLink, { headers, signal });
      const blogResText = (await blogRes.text()) as any;
      if (blogResText.includes("Invalid Request")) {
        console.log(blogResText);
      } else {
        vcloudLink = blogResText.match(/var reurl = "([^"]+)"/) || "";
        break;
      }
    }

    return blogLink || link;
  } catch (err) {
    // Silently ignore - old extraction method no longer used
    // console.log("Error in getRedirectLinks", err);
    return link;
  }
}

function rot13(str: string) {
  return str.replace(/[a-zA-Z]/g, function (char) {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= "Z";
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      ((charCode - baseCharCode + 13) % 26) + baseCharCode
    );
  });
}

export function decodeString(encryptedString: string) {
  try {
    if (!encryptedString || encryptedString.trim() === '') {
      console.log('⚠️  Empty encrypted string, cannot decode');
      return null;
    }

    console.log('🔐 Decoding string, length:', encryptedString.length);

    // First base64 decode
    let decoded = atob(encryptedString);

    // Second base64 decode
    decoded = atob(decoded);

    // ROT13 decode
    decoded = rot13(decoded);

    // Third base64 decode
    decoded = atob(decoded);

    return JSON.parse(decoded);
  } catch (error: any) {
    console.log('❌ Error decoding string:', error.message);
    console.log('   Input string:', encryptedString?.substring(0, 100) + '...');
    return null;
  }
}
