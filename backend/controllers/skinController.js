import Skin from '../models/SkinModel.js';
import User from '../models/UserModel.js'; // Necesitamos al usuario para actualizar sus monedas

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

// C: Lógica de Compra
export const purchaseSkin = async (req, res) => {
    // Nota: El costo de la skin se asume que viene del Front (body), 
    // pero DEBE VALIDARSE en el Backend contra un valor fijo de la DB. 
    // Por simplicidad, asumiremos que el costo viene en el cuerpo y es válido para este ejemplo.
    const { userId, skinId, cost, currency } = req.body; 

    // **NOTA DE SEGURIDAD:** En una versión real, DEBES buscar el costo real en la DB.
    const purchaseCost = parseFloat(cost); 

    if (!userId || !skinId || !purchaseCost || currency !== 'coins') {
        return res.status(400).json({ message: 'Faltan datos de compra válidos.' });
    }

    try {
        // 1. Verificar si el usuario ya la tiene
        const alreadyOwns = await Skin.userHasSkin(userId, skinId);
        if (alreadyOwns) {
            return res.status(409).json({ message: 'Ya posees esta skin.' });
        }

        // 2. Obtener datos del usuario
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // 3. Verificar saldo
        if (user.coins < purchaseCost) {
            return res.status(403).json({ message: 'Fondos insuficientes (Coins).' });
        }

        // --- Lógica de Transacción (Compra Exitosa) ---

        // 4. Registrar la skin en el inventario del usuario
        await Skin.addSkinToUser(userId, skinId);

        // 5. Descontar el costo de las monedas del usuario
        const newCoins = user.coins - purchaseCost;
        await User.update(userId, { coins: newCoins });

        // 6. Respuesta
        res.status(200).json({
            success: true,
            message: `¡Skin ${skinId} comprada!`,
            new_coins: newCoins
        });

    } catch (error) {
        console.error('Error en la compra de skin:', error);
        res.status(500).json({ message: 'Error al procesar la compra.' });
    }
};