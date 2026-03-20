import Movement from '../models/MovementModel.js';
import User from '../models/UserModel.js';

// --- C: CREATE MOVEMENT (Con integración de Monedas) ---
export const createMovement = async (req, res) => {
    try {
        const { user_id, fecha, tipo, categoria, monto, descripcion } = req.body;

        // 1. Validaciones básicas (se asume que ya están hechas)
        if (!user_id || !fecha || !tipo || !monto || 
            (tipo !== 'income' && tipo !== 'expense')) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios o el tipo es inválido (solo income/expense).' });
        }
        
        const newMovement = {
            user_id, fecha, tipo, categoria, descripcion,
            monto: parseFloat(monto),
        };

        // 2. Registrar el movimiento en la tabla 'movements'
        const createdMovement = await Movement.create(newMovement);

        // 3. Determinar el impacto en las monedas (coins)
        const amount = parseFloat(monto);
        let coinChange = 0;
        
        if (tipo === 'income') {
            coinChange = amount; // Ingreso = Ganas monedas
        } else if (tipo === 'expense') {
            coinChange = -amount; // Gasto = Pierdes monedas
        }

        // 4. Obtener el usuario actual y calcular el nuevo saldo
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const newCoins = user.coins + coinChange;
        
        // 5. Actualizar las monedas del usuario en la tabla 'users'
        await User.update(user_id, { coins: newCoins });

        // 6. Responder al frontend
        res.status(201).json({
            success: true,
            message: `Movimiento registrado. Monedas actualizadas: ${user.coins} -> ${newCoins}`,
            data: createdMovement,
            new_coins: newCoins 
        });

    } catch (error) {
        console.error('Error al crear movimiento y actualizar coins:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor al registrar movimiento.', error: error.message });
    }
};

// --- R: READ MOVEMENT DATA ---
export const getMovementData = async (req, res) => {
    try {
        const userId = req.params.userId; // user_id viene del URL

        if (!userId) {
            return res.status(400).json({ message: 'ID de usuario es requerido.' });
        }

        const [history, totals] = await Promise.all([
            Movement.getByUserId(userId),
            Movement.getTotalsByUserId(userId)
        ]);

        res.json({
            success: true,
            totals, 
            history 
        });
        
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({ message: 'Error en el servidor.', error: error.message });
    }
};

// --- D: DELETE MOVEMENT (Con reversión de Monedas) ---
export const deleteMovement = async (req, res) => {
    try {
        const movementId = req.params.movementId; 
        const userId = req.body.user_id; // Asumido del body o del token

        if (!movementId || !userId) {
             return res.status(400).json({ message: 'IDs son requeridos para la eliminación.' });
        }

        // 1. Obtener el movimiento ANTES de borrarlo para saber su tipo y monto.
        const movementToDelete = await Movement.findById(movementId, userId);
        
        if (!movementToDelete) {
             return res.status(404).json({ message: 'Movimiento no encontrado o no pertenece a este usuario.' });
        }
        
        // 2. Eliminar el movimiento de la base de datos (DELETE)
        await Movement.deleteById(movementId, userId);

        // 3. Determinar el impacto INVERSO en las monedas
        const amount = parseFloat(movementToDelete.monto);
        let coinChange = 0;
        
        if (movementToDelete.tipo === 'income') {
            // Si borramos un INGRESO, debemos RESTAR ese monto del saldo.
            coinChange = -amount; 
        } else if (movementToDelete.tipo === 'expense') {
            // Si borramos un GASTO, debemos SUMAR ese monto de vuelta al saldo.
            coinChange = amount; 
        }

        // 4. Obtener el usuario actual y actualizar el saldo
        const user = await User.findById(userId);
        const newCoins = user.coins + coinChange;
        
        await User.update(userId, { coins: newCoins });
        
        // 5. Responder al frontend
        res.json({ success: true, message: `Movimiento eliminado. Monedas revertidas: ${user.coins} -> ${newCoins}`, new_coins: newCoins });

    } catch (error) {
        console.error('Error al eliminar movimiento y revertir coins:', error);
        res.status(500).json({ message: 'Error en el servidor.', error: error.message });
    }
};