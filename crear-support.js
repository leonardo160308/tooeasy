// crear-support.js
// Ejecutar: node crear-support.js
// Crea un usuario con rol 'support' en Supabase

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function crearSupport() {
    const nombre   = 'soporte';
    const email    = 'tooeasysoporte@gmail.com';
    const password = 'support123';
    const edad     = 25;
    const genero   = 'otro';

    console.log('🔐 Generando hash de contraseña...');
    const password_hash = await bcrypt.hash(password, 12);
    console.log('✅ Hash generado');

    console.log('📝 Insertando/actualizando usuario support en Supabase...');

    // onConflict: 'nombre' — si ya existe el usuario 'soporte', actualiza su email
    // (nombre es UNIQUE en la tabla users)
    const { data, error } = await supabaseAdmin
        .from('users')
        .upsert(
            {
                nombre,
                email,
                password_hash,
                edad,
                genero,
                role:                  'support',
                email_verified:        true,
                is_active:             true,
                failed_login_attempts: 0,
            },
            { onConflict: 'nombre' }
        )
        .select('id, nombre, email, role')
        .single();

    if (error) {
        console.error('❌ Error al insertar/actualizar support:', error.message);
        process.exit(1);
    }

    console.log('🎉 Usuario support creado/actualizado exitosamente:');
    console.table(data);
    console.log('\n📌 Datos de acceso:');
    console.log('   Usuario:    soporte');
    console.log('   Correo:     tooeasysoporte@gmail.com');
    console.log('   Contraseña: support123');
    console.log('\n⚠️  Cambia la contraseña después del primer inicio de sesión.');
}

crearSupport();
