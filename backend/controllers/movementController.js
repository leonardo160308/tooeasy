import Movement from '../models/MovementModel.js';
import User from '../models/UserModel.js';

// --- C: CREATE MOVEMENT (CON VALIDACIONES + BALANCE DASHBOARD) ---
export const createMovement = async (req, res) => {
    try {
        const { user_id, fecha, tipo, categoria, monto, descripcion } = req.body;

        if (
            !user_id ||
            !fecha ||
            !tipo ||
            !monto ||
            (tipo !== 'income' && tipo !== 'expense')
        ) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios o el tipo es inválido (solo income/expense).'
            });
        }

        const montoNumerico = Number(monto);

        if (!Number.isFinite(montoNumerico)) {
            return res.status(400).json({ success: false, message: 'Monto inválido' });
        }

        if (montoNumerico <= 0) {
            return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0.' });
        }

        if (montoNumerico > 99999999.99) {
            return res.status(400).json({
                success: false,
                message: 'El monto es demasiado grande. Máximo permitido: $99,999,999.99'
            });
        }

        const newMovement = { user_id, fecha, tipo, categoria, descripcion, monto: montoNumerico };
        const createdMovement = await Movement.create(newMovement);

        const balanceChange = tipo === 'income' ? montoNumerico : -montoNumerico;

        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const currentBalance = parseFloat(user.dashboard_balance) || 0;
        const newBalance = currentBalance + balanceChange;

        await User.update(user_id, { dashboard_balance: newBalance });

        res.status(201).json({
            success: true,
            message: `Movimiento registrado. Balance actualizado: $${currentBalance.toFixed(2)} → $${newBalance.toFixed(2)}`,
            data: createdMovement,
            new_balance: newBalance
        });

    } catch (error) {
        console.error('Error al crear movimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor al registrar movimiento.'
        });
    }
};

// --- U: UPDATE MOVEMENT (RECALCULA BALANCE) ---
export const updateMovement = async (req, res) => {
    try {
        const { movementId } = req.params;
        const { tipo, categoria, monto } = req.body;

        if (!tipo || !monto || (tipo !== 'income' && tipo !== 'expense')) {
            return res.status(400).json({
                success: false,
                message: 'Tipo (income/expense), categoría y monto son obligatorios.'
            });
        }

        const montoNumerico = Number(monto);

        if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
            return res.status(400).json({ success: false, message: 'Monto inválido. Debe ser mayor a 0.' });
        }

        if (montoNumerico > 99999999.99) {
            return res.status(400).json({
                success: false,
                message: 'El monto es demasiado grande. Máximo: $99,999,999.99'
            });
        }

        // Obtener movimiento original
        const oldMovement = await Movement.findById(movementId);
        if (!oldMovement) {
            return res.status(404).json({ success: false, message: 'Movimiento no encontrado.' });
        }

        // Verificar que el movimiento pertenece al usuario que hace la petición
        const { user_id: requestUserId } = req.body;
        if (!requestUserId || oldMovement.user_id !== requestUserId) {
            return res.status(403).json({ success: false, message: 'Acceso denegado.' });
        }

        // Obtener usuario
        const user = await User.findById(oldMovement.user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        // Calcular delta de balance: revertir efecto anterior + aplicar nuevo
        const oldEffect = oldMovement.tipo === 'income'
            ? parseFloat(oldMovement.monto)
            : -parseFloat(oldMovement.monto);

        const newEffect = tipo === 'income' ? montoNumerico : -montoNumerico;
        const delta = newEffect - oldEffect;

        const currentBalance = parseFloat(user.dashboard_balance) || 0;
        const newBalance = currentBalance + delta;

        // Actualizar movimiento en BD
        const updated = await Movement.update(movementId, { tipo, categoria, monto: montoNumerico });

        // Actualizar balance del usuario
        await User.update(oldMovement.user_id, { dashboard_balance: newBalance });

        res.json({
            success: true,
            message: 'Movimiento actualizado correctamente.',
            data: updated,
            new_balance: newBalance
        });

    } catch (error) {
        console.error('Error al actualizar movimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor al actualizar movimiento.'
        });
    }
};

// --- D: DELETE MOVEMENT (REVERSA BALANCE DASHBOARD) ---
export const deleteMovement = async (req, res) => {
    try {
        const { movementId } = req.params;
        const { user_id } = req.body;

        if (!movementId) {
            return res.status(400).json({ success: false, message: 'ID del movimiento requerido.' });
        }
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'user_id requerido.' });
        }

        const movement = await Movement.findById(movementId);
        if (!movement) {
            return res.status(404).json({ success: false, message: 'Movimiento no encontrado.' });
        }

        // Verificar que el movimiento pertenece al usuario solicitante
        if (movement.user_id !== user_id) {
            return res.status(403).json({ success: false, message: 'Acceso denegado.' });
        }

        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const balanceChange = movement.tipo === 'income'
            ? -parseFloat(movement.monto)
            : parseFloat(movement.monto);

        const currentBalance = parseFloat(user.dashboard_balance) || 0;
        const newBalance = currentBalance + balanceChange;

        await User.update(user_id, { dashboard_balance: newBalance });
        // Usar deleteById que filtra también por user_id en la BD
        await Movement.deleteById(movementId, user_id);

        res.json({
            success: true,
            message: 'Movimiento eliminado y balance actualizado.',
            new_balance: newBalance
        });

    } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor al eliminar movimiento.'
        });
    }
};

// --- R: GET MOVEMENTS + TOTALS BY USER ---
export const getMovementData = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const movements = await Movement.findByUserId(userId);

        let totalIncome = 0;
        let totalExpense = 0;

        for (const m of movements) {
            const monto = parseFloat(m.monto) || 0;
            if (m.tipo === 'income') totalIncome += monto;
            else if (m.tipo === 'expense') totalExpense += monto;
        }

        const balance = totalIncome - totalExpense;

        res.json({
            success: true,
            data: {
                movements,
                totals: { income: totalIncome, expense: totalExpense, balance }
            },
            history: movements
        });

    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor al obtener movimientos.',
            error: error.message
        });
    }
};