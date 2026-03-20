// crear-admin.js
// Ejecuta: node crear-admin.js
// Requiere que tengas las variables de entorno configuradas en .env

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function crearAdmin() {
    const nombre   = 'admin';
    const email    = 'tooeasycontactanos@gmail.com';
    const password = 'admin123';
    const edad     = 30;
    const genero   = 'otro';

    console.log('🔐 Generando hash de contraseña...');
    const password_hash = await bcrypt.hash(password, 12);
    console.log('✅ Hash generado:', password_hash);

    console.log('📝 Insertando usuario admin en Supabase...');

    const { data, error } = await supabaseAdmin
        .from('users')
        .upsert(
            {
                nombre,
                email,
                password_hash,
                edad,
                genero,
                role:           'admin',
                email_verified: true,
                is_active:      true,
                failed_login_attempts: 0,
            },
            { onConflict: 'email' }  // Si ya existe el email, actualiza
        )
        .select('id, nombre, email, role')
        .single();

    if (error) {
        console.error('❌ Error al insertar/actualizar admin:', error.message);
        process.exit(1);
    }

    console.log('🎉 Usuario admin creado/actualizado exitosamente:');
    console.table(data);
    console.log('\n📌 Datos de acceso:');
    console.log('   Usuario:    admin');
    console.log('   Correo:     tooeasycontactanos@gmail.com');
    console.log('   Contraseña: admin123');
}

crearAdmin();
