import mysql from 'mysql2/promise';

// A lightweight helper that creates a pool using environment variables.
// Expected env variables (set in .env.local for Next.js):
// MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'phionix',
  port: Number(process.env.MYSQL_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query<T = any>(sql: string, params?: any[]) {
  const [rows] = await pool.execute(sql, params || []);
  return rows as T;
}

export default pool;
