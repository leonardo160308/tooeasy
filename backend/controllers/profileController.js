import User from '../models/UserModel.js';

const MAX_LEVEL      = 10;
const COSTO_MADERA   = 20;
const COSTO_MONEDAS  = 34;

// POST: Mejorar Casa o Castor
export const upgradeItem = async (req, res) => {
    try {
        const { userId, type } = req.body;

        if (!userId || !type) {
            return res.status(400).json({ success: false, message: 'userId y type son requeridos.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        let updateData = {};

        if (type === 'house') {
            if ((user.house_level || 1) >= MAX_LEVEL) {
                return res.status(400).json({ success: false, message: 'La casa ya está al nivel máximo.' });
            }
            if ((user.wood || 0) < COSTO_MADERA) {
                return res.status(400).json({ success: false, message: `No tienes suficiente madera (${COSTO_MADERA}).` });
            }
            updateData.wood        = user.wood - COSTO_MADERA;
            updateData.house_level = (user.house_level || 1) + 1;

        } else if (type === 'beaver') {
            if ((user.beaver_level || 1) >= MAX_LEVEL) {
                return res.status(400).json({ success: false, message: 'El castor ya está al nivel máximo.' });
            }
            if ((user.coins || 0) < COSTO_MONEDAS) {
                return res.status(400).json({ success: false, message: `No tienes suficientes monedas (${COSTO_MONEDAS}).` });
            }
            updateData.coins        = user.coins - COSTO_MONEDAS;
            updateData.beaver_level = (user.beaver_level || 1) + 1;
        } else {
            return res.status(400).json({ success: false, message: 'Tipo de mejora inválido. Usa: house o beaver.' });
        }

        await User.update(userId, updateData);

        res.json({
            success:   true,
            message:   `¡${type} mejorado al nivel ${type === 'house' ? updateData.house_level : updateData.beaver_level}!`,
            new_stats: updateData
        });

    } catch (error) {
        console.error('Error en upgradeItem:', error);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
};

// PUT: Equipar una skin (Cambiar apariencia)
// PUT: Equipar una skin (Cambiar apariencia)
export const equipSkin = async (req, res) => {
    try {
        const { userId, skinId, type } = req.body;
        
        if (!userId || !skinId || !type) {
            return res.status(400).json({ 
                success: false,
                message: 'Faltan parámetros: userId, skinId o type' 
            });
        }
        
        let updateData = {};
        
        if (type === 'house') {
            updateData.current_appearance = skinId;
        } else if (type === 'beaver') {
            updateData.current_beaver = skinId;
        } else if (type === 'avatar') {
            updateData.foto = skinId; // Guardamos solo el nombre: "avatar1", "avatar2", etc.
        } else {
            return res.status(400).json({ 
                success: false,
                message: 'Tipo inválido. Usa: house, beaver o avatar' 
            });
        }

        const result = await User.update(userId, updateData);
        
        if (!result || result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado o sin cambios' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Apariencia actualizada correctamente' 
        });
        
    } catch (error) {
        console.error('Error en equipSkin:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor.'
        });
    }
};