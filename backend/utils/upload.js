// backend/utils/upload.js
import multer from 'multer';
import path   from 'path';
import fs     from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../frontend/public/img/tickets');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXTS  = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename:    (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `tk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    }
});

const multerInstance = multer({
    storage,
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
