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
        lib.get(targetUrl, (fileRes) => {
            if (fileRes.statusCode === 301 || fileRes.statusCode === 302 || fileRes.statusCode === 307 || fileRes.statusCode === 308) {
                return fetchAndPipe(fileRes.headers.location, redirectCount + 1);
            }
            if (fileRes.statusCode !== 200) {
                return res.status(502).json({ success: false, message: 'Error al obtener el archivo.' });
            }
            res.setHeader('Content-Disposition', 'attachment; filename="too-easy.apk"');
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            if (fileRes.headers['content-length']) {
                res.setHeader('Content-Length', fileRes.headers['content-length']);
            }
            fileRes.pipe(res);
        }).on('error', () => {
            res.status(502).json({ success: false, message: 'Error al obtener el archivo.' });
        });
    }

    fetchAndPipe(url);
});

export default router;
