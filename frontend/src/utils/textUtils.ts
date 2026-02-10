export const cleanTitle = (rawTitle: string) => {
    // Extract season number if present
    const seasonMatch = rawTitle.match(/season\s*(\d+)/i);

    // Remove age ratings like [18+], [R], [PG-13] first
    let cleaned = rawTitle.replace(/^\s*\[\d+\+\]|\[R\]|\[PG-13\]|\[PG\]/gi, '').trim();

    // Try to extract the main title - it's usually before quality indicators or in parentheses
    // Common pattern: "[18+] Movie Name (Season X) BluRay [Quality]"

    // Remove everything after common technical indicators
    cleaned = cleaned
        .replace(/\s+(BluRay|WEB-DL|WEBRip|HDRip|DVDRip|HDTC|CAMRip|PreDVDRip|BRRip).*$/i, '')
        .replace(/\s+\d{3,4}p.*$/i, '') // Remove 1080p, 720p, 480p and everything after
        .replace(/\s+\[.*?(Hindi|English|Tamil|Telugu|Dual|Audio|ORG|x264|x265|HEVC|10Bit|8Bit).*?\].*$/i, '')
        .replace(/\s+\(.*?(Hindi|English|Tamil|Telugu|Dual|Audio|ORG).*?\).*$/i, '');

    // Remove common suffixes
    cleaned = cleaned
        .replace(/\s*\|\s*(TVSeries|Movie|Film).*$/i, '')
        .replace(/\s*-\s*(ALL Episodes|Complete|Full).*$/i, '')
        .replace(/\s*\[ALL Episodes\].*$/i, '');

    // Extract season info before removing parentheses
    let seasonInfo = '';
    if (seasonMatch) {
        seasonInfo = ` (Season ${seasonMatch[1]})`;
        // Remove season from title temporarily
        cleaned = cleaned.replace(/\s*\(?\s*season\s*\d+\s*\)?/gi, '');
    }

    // Clean up remaining brackets and parentheses that might have metadata
    // But preserve parentheses with years like (2023)
    cleaned = cleaned
        .replace(/\[.*?\]/g, '') // Remove all square brackets
        .replace(/\(\s*\)/g, '') // Remove empty parentheses
        .replace(/\./g, ' ') // Replace dots with spaces
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/\s*[-–—]\s*$/g, '') // Remove trailing dashes
        .trim();

    // Add back season info if present
    if (seasonInfo) {
        cleaned += seasonInfo;
    }

    return cleaned || rawTitle; // Fallback to raw title if cleaning resulted in empty string
};
