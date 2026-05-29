import express from 'express';

const router = express.Router();

// GET /api/app/download — redirige a la APK (URL configurada en env APK_DOWNLOAD_URL)
router.get('/app/download', (req, res) => {
    const url = process.env.APK_DOWNLOAD_URL;
    if (!url) {
        return res.status(503).json({ success: false, message: 'Descarga no disponible por el momento.' });
    }
    res.redirect(302, url);
});

export default router;
