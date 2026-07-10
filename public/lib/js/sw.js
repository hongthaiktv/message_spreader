self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('fetch', event => {
	const url = new URL(event.request.url);

	// Don't cache/handle SSE requests
	if (url.pathname.startsWith('/logger')) {
		return; // let browser handle it directly
	}
});

