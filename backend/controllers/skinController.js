// backend/controllers/skinController.js
import Skin from '../models/SkinModel.js';
import User from '../models/UserModel.js';

// R: Obtener el catálogo completo de skins
export const getShopSkins = async (req, res) => {
    try {
        const skins = await Skin.getAll();
        res.json({ success: true, data: skins });
    } catch (error) {
        console.error('Error al obtener skins:', error);
        res.status(500).json({ success: false, message: 'Error al cargar la tienda.' });
    }
};

// C: Compra de skin (con monedas)
export const purchaseSkin = async (req, res) => {
    const { userId, skinId, cost, currency } = req.body;
    const purchaseCost = parseFloat(cost);

    if (!userId || !skinId || !purchaseCost || currency !== 'coins') {
        return res.status(400).json({ message: 'Faltan datos de compra válidos.' });
    }

    try {
        const alreadyOwns = await Skin.userHasSkin(userId, skinId);
        if (alreadyOwns) return res.status(409).json({ message: 'Ya posees esta skin.' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        if (user.coins < purchaseCost) return res.status(403).json({ message: 'Fondos insuficientes (Coins).' });

        await Skin.addSkinToUser(userId, skinId);
        const newCoins = user.coins - purchaseCost;
        await User.update(userId, { coins: newCoins });

        res.status(200).json({ success: true, message: `¡Skin ${skinId} comprada!`, new_coins: newCoins });
    } catch (error) {
        console.error('Error en la compra de skin:', error);
        res.status(500).json({ message: 'Error al procesar la compra.' });
    }
};

/**
 * POST /api/skins/unlock
 * Desbloquea una skin como RECOMPENSA (sin costo) al completar niveles educativos.
 * Body: { userId, skinId }
 */
export const unlockSkin = async (req, res) => {
    const { userId, skinId } = req.body;

    if (!userId || !skinId) {
        return res.status(400).json({ success: false, message: 'userId y skinId son requeridos.' });
    }

    try {
        // Verificar que la skin existe
        const skin = await Skin.getById(skinId);
        if (!skin) return res.status(404).json({ success: false, message: 'Skin no encontrada.' });

        // Verificar si ya la tiene (idempotente: no es error)
        const alreadyOwns = await Skin.userHasSkin(userId, skinId);
        if (alreadyOwns) {
            return res.json({ success: true, message: 'La skin ya estaba desbloqueada.', already: true });
        }

        await Skin.addSkinToUser(userId, skinId);

        console.log(`🎁 Skin desbloqueada como recompensa: usuario ${userId} → ${skinId}`);
        res.json({ success: true, message: `¡Skin ${skin.nombre} desbloqueada como recompensa!` });
    } catch (error) {
        console.error('Error al desbloquear skin:', error);
        res.status(500).json({ success: false, message: 'Error al desbloquear la skin.' });
    }
};