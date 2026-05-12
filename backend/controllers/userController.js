import User from '../models/UserModel.js';
import { supabase } from '../config/supabase.js';
import { hashPassword, comparePassword } from '../utils/security.js';

// ========================================
// REGISTRO DE USUARIO
// ========================================
export const registerUser = async (req, res) => {
    try {
        const { nombre, email, password, edad, genero } = req.body;

        if (!nombre || !email || !password || edad === undefined) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
        }

        if (nombre.length < 3 || nombre.length > 16) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario debe tener entre 3 y 16 caracteres' });
        }

        if (password.length < 6 || password.length > 16) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener entre 6 y 16 caracteres' });
        }

        if (email.length < 6 || email.length > 254) {
            return res.status(400).json({ success: false, message: 'El correo debe tener entre 6 y 254 caracteres' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'El formato del correo electrónico no es válido' });
        }

        const edadNum = Number(edad);
        if (!Number.isInteger(edadNum)) {
            return res.status(400).json({ success: false, message: 'La edad debe ser un número entero (sin decimales)' });
        }
        if (edadNum < 15 || edadNum > 99) {
            return res.status(400).json({ success: false, message: 'La edad debe estar entre 15 y 99 años' });
        }

        const newUser = {
            nombre,
            email,
            password_hash: await hashPassword(password),
            edad: edadNum,
            genero: genero || 'no_especificado',
            foto: null
        };

        const createdUser = await User.create(newUser);

        res.status(201).json({ success: true, message: 'Usuario creado exitosamente', data: createdUser });

    } catch (error) {
        console.error('Error en registerUser:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Ese nombre de usuario o email ya están registrados' });
        }

        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// ========================================
// LOGIN DE USUARIO
// ========================================
export const loginUser = async (req, res) => {
    try {
        const { nombre, password } = req.body;

        if (!nombre || !password) {
            return res.status(400).json({ success: false, message: 'Nombre y contraseña requeridos' });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('nombre', nombre);

        if (error) throw error;

        const user = users && users[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        const passwordOk = await comparePassword(password, user.password_hash);
        if (!passwordOk) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        res.json({
            success: true,
            message: 'Bienvenido',
            user: {
                id: user.id,
                nombre: user.nombre,
                level: user.level,
                coins: user.coins,
                wood: user.wood,
                foto: user.foto,
                role: user.role || 'user'
            }
        });

    } catch (error) {
        console.error('Error en loginUser:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};

// ========================================
// PERFIL, UPDATE, DELETE
// ========================================
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'No encontrado' });

        // Nunca exponer campos sensibles al cliente
        const {
            password_hash, failed_login_attempts, locked_until,
            email_verified_at, last_login_at,
            ...safeUser
        } = user;

        res.json(safeUser);
    } catch (error) {
        console.error('Error en getUserProfile:', error);
        res.status(500).json({ success: false, message: 'Error al obtener perfil.' });
    }
};

// ============================================================
// REEMPLAZA la función updateUser en backend/controllers/userController.js
// ============================================================

export const updateUser = async (req, res) => {
    try {
        const dataToUpdate = { ...req.body };
        delete dataToUpdate.id;
        delete dataToUpdate.password_hash;
        delete dataToUpdate.role;          // nunca permitir cambiar role desde aquí
        delete dataToUpdate.email;         // nunca cambiar email desde perfil

        const result = await User.update(req.params.id, dataToUpdate);

        if (!result || result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado o sin cambios.'
            });
        }

        res.json({ success: true, message: 'Perfil actualizado.', data: result.data });

    } catch (error) {
        console.error('Error en updateUser:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: error.message  // "Ese nombre de usuario ya está en uso."
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno al actualizar el perfil.'
        });
    }
};
export const deleteUser = async (req, res) => {
    try {
        const result = await User.deleteLogical(req.params.id);
        if (!result || result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Error al borrar' });
        }
        res.json({ success: true, message: 'Baja exitosa' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};