// backend/utils/upload.js
import multer from 'multer';
import path   from 'path';

const ALLOWED_EXTS  = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

const multerInstance = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTS.includes(ext) && ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes PNG, JPG, JPEG o WEBP (máx. 5 MB).'), false);
        }
    }
});

export function handleTicketUpload(req, res, next) {
    multerInstance.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Error al subir imagen: ${err.message}` });
        }
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}
