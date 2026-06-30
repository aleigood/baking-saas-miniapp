const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function resolveAssetUrl(url?: string | null): string {
	if (!url) return '';
	if (/^(https?:|data:|blob:)/.test(url)) return url;
	return `${apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`;
}
