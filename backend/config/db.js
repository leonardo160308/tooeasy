import mysql from 'mysql2/promise'; // OJO: Asegúrate de instalarlo: npm install mysql2 dotenv
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'kasanajisa1.',
    database: process.env.DB_NAME || 'tooeasy',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Prueba de conexión inicial
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexión exitosa a la base de datos TOO-EASY');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error de conexión a la base de datos:', err);
    });

export default pool;