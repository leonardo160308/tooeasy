// backend/controllers/userController.js

import User from '../models/UserModel.js';
import db from '../config/db.js'; // ⬅️ AÑADIDO: Importación necesaria para login

// ========================================
// REGISTRO DE USUARIO
// ========================================
export const registerUser = async (req, res) => {
    try {
        const { nombre, password, edad, genero } = req.body;

        // 1. Validaciones básicas
        if (!nombre || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre y contraseña son obligatorios' 
            });
        }

        // TODO: Encriptar la contraseña con bcrypt antes de guardarla
        // import bcrypt from 'bcrypt';
        // const password_hash = await bcrypt.hash(password, 10);
        const password_hash = password; // ⚠️ TEMPORAL - En producción DEBE estar encriptada

        // 2. Preparar datos para el modelo
        const newUser = {
            nombre,
            password_hash,
            edad: edad || 0,
            genero: genero || 'no_especificado',
            foto: null // El frontend decidirá la imagen default si es null
        };

        // 3. Llamar al modelo
        const createdUser = await User.create(newUser);

        // 4. Responder al frontend
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: createdUser
        });

    } catch (error) {
        console.error('Error en registerUser:', error);
        
        // Manejar error de nombre duplicado (código MySQL 1062)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'El nombre de usuario ya existe. Elige otro.'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error en el servidor al crear usuario',
            error: error.message
        });
    }
};

// ========================================
// LOGIN DE USUARIO
// ========================================
export const loginUser = async (req, res) => {
    try {
        const { nombre, password } = req.body;

        // 1. Validaciones
        if (!nombre || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre y contraseña son obligatorios' 
            });
        }

        // 2. Buscar usuario por nombre en la BD
        const [users] = await db.execute(
            'SELECT * FROM users WHERE nombre = ?', 
            [nombre]
        );
        
        const user = users[0];

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        // 3. Verificar contraseña
        // TODO: Usar bcrypt.compare() cuando las contraseñas estén encriptadas
        // const isValidPassword = await bcrypt.compare(password, user.password_hash);
        const isValidPassword = (user.password_hash === password); // ⚠️ TEMPORAL
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña incorrecta' 
            });
        }

        // 4. Login exitoso - Responder con datos del usuario
        res.json({
            success: true,
            message: 'Bienvenido',
            user: {
                id: user.id,
                nombre: user.nombre,
                level: user.level,
                coins: user.coins,
                wood: user.wood,
                foto: user.foto
            }
        });

    } catch (error) {
        console.error('Error en loginUser:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error en el servidor al iniciar sesión',
            error: error.message
        });
    }
};

// ========================================
// OBTENER PERFIL DE USUARIO
// ========================================
export const getUserProfile = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }

        res.json(user);
    } catch (error) {
        console.error('Error en getUserProfile:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

// ========================================
// ACTUALIZAR DATOS DEL USUARIO
// ========================================
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const dataToUpdate = req.body;

        // Evitar que actualicen campos críticos por seguridad
        delete dataToUpdate.id;
        delete dataToUpdate.created_at;
        delete dataToUpdate.password_hash; // La contraseña se cambia en otra ruta

        const result = await User.update(id, dataToUpdate);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado o sin cambios' 
            });
        }

        res.json({ 
            success: true,
            message: 'Usuario actualizado correctamente', 
            data: dataToUpdate 
        });
    } catch (error) {
        console.error('Error en updateUser:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

// ========================================
// BORRAR USUARIO (Baja lógica)
// ========================================
// ========================================
// BORRAR USUARIO (Baja lógica)
// ========================================
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Intentando eliminar usuario:', id); // Debug
        
        if (!id) {
            return res.status(400).json({ 
                success: false,
                message: 'ID de usuario requerido' 
            });
        }
        
        // Verificar que el usuario existe antes de intentar borrar
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }
        
        const result = await User.deleteLogical(id);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'No se pudo eliminar el usuario' 
            });
        }

        res.json({ 
            success: true,
            message: 'Usuario dado de baja exitosamente' 
        });
        
    } catch (error) {
        console.error('Error en deleteUser:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error del servidor: ' + error.message 
        });
    }
    
};

