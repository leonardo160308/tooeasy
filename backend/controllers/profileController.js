import User from '../models/UserModel.js';

// POST: Mejorar Casa o Castor
export const upgradeItem = async (req, res) => {
    try {
        const { userId, type } = req.body; // type puede ser 'house' o 'beaver'
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        let updateData = {};

        // Lógica de Precios (Según tu documento)
        if (type === 'house') {
            const costoMadera = 20; 
            if (user.wood < costoMadera) {
                return res.status(400).json({ message: 'No tienes suficiente madera (20).' });
            }
            updateData.wood = user.wood - costoMadera;
            updateData.house_level = user.house_level + 1;

        } else if (type === 'beaver') {
            const costoMonedas = 34;
            if (user.coins < costoMonedas) {
                return res.status(400).json({ message: 'No tienes suficientes monedas (34).' });
            }
            updateData.coins = user.coins - costoMonedas;
            updateData.beaver_level = user.beaver_level + 1;
        } else {
            return res.status(400).json({ message: 'Tipo de mejora inválido' });
        }

        // Aplicar cambio
        await User.update(userId, updateData);

        res.json({ 
            success: true, 
            message: `¡${type} mejorado al nivel ${type === 'house' ? updateData.house_level : updateData.beaver_level}!`,
            new_stats: updateData 
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT: Equipar una skin (Cambiar apariencia)
// PUT: Equipar una skin (Cambiar apariencia)
export const equipSkin = async (req, res) => {
    try {
        const { userId, skinId, type } = req.body;
        
        console.log('Equipando skin:', { userId, skinId, type }); // Debug
        
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

        console.log('Actualizando con:', updateData); // Debug
        
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
            message: 'Error del servidor: ' + error.message 
        });
    }
};