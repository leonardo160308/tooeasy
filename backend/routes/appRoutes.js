import express from 'express';
import https from 'https';
import http from 'http';

const router = express.Router();

// GET /api/app/download — hace proxy del APK para forzar descarga directa
router.get('/app/download', (req, res) => {
    const url = process.env.APK_DOWNLOAD_URL;
    if (!url) {
        return res.status(503).json({ success: false, message: 'Descarga no disponible por el momento.' });
    }

    function fetchAndPipe(targetUrl, redirectCount = 0) {
        if (redirectCount > 5) {
            return res.status(502).json({ success: false, message: 'Error al obtener el archivo.' });
        }

        const lib = targetUrl.startsWith('https') ? https : http;
        const parsed = new URL(targetUrl);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TooEasy/1.0)' }
        };

        lib.get(options, (fileRes) => {
            if ([301, 302, 307, 308].includes(fileRes.statusCode)) {
                fileRes.resume();
                return fetchAndPipe(fileRes.headers.location, redirectCount + 1);
            }
            if (fileRes.statusCode !== 200) {
                fileRes.resume();
                return res.status(502).json({ success: false, message: 'Error al obtener el archivo.' });
            }
            res.setHeader('Content-Disposition', 'attachment; filename="too-easy.apk"');
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            if (fileRes.headers['content-length']) {
                res.setHeader('Content-Length', fileRes.headers['content-length']);
            }
            fileRes.pipe(res);
        }).on('error', () => {
            if (!res.headersSent) {
                res.status(502).json({ success: false, message: 'Error al obtener el archivo.' });
            }
        });
    }

    fetchAndPipe(url);
});

export default router;
