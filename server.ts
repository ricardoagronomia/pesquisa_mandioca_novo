import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-mandioca';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Pool de conexão MySQL/MariaDB
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pesquisa_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Criar tabelas se não existirem
  const initDb = async () => {
    try {
      // Tabela de usuários
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          is_approved BOOLEAN DEFAULT FALSE,
          role VARCHAR(50) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Experimentos
      await pool.query(`
        CREATE TABLE IF NOT EXISTS experiments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50),
          name VARCHAR(255),
          objective TEXT,
          researcher VARCHAR(255),
          planting_date DATE,
          farm VARCHAR(255),
          municipality VARCHAR(255),
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Monitoramentos
      await pool.query(`
        CREATE TABLE IF NOT EXISTS monitoring_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          experiment_id INT,
          plot_code VARCHAR(50),
          block_number INT,
          monitoring_date DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        )
      `);

      // Biometria
      await pool.query(`
        CREATE TABLE IF NOT EXISTS plant_biometrics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          monitoring_event_id INT,
          plant_position INT,
          has_sprouted BOOLEAN DEFAULT FALSE,
          is_reference_plant BOOLEAN DEFAULT FALSE,
          stem_count INT,
          sanity_score FLOAT,
          sanity_observations TEXT,
          FOREIGN KEY (monitoring_event_id) REFERENCES monitoring_events(id) ON DELETE CASCADE
        )
      `);

      // Mediçoes de hastes
      await pool.query(`
        CREATE TABLE IF NOT EXISTS plant_stem_measurements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          biometric_id INT,
          stem_number INT,
          height_cm FLOAT,
          diameter_cm FLOAT,
          FOREIGN KEY (biometric_id) REFERENCES plant_biometrics(id) ON DELETE CASCADE
        )
      `);

      // Drone
      await pool.query(`
        CREATE TABLE IF NOT EXISTS drone_monitoring (
          id INT AUTO_INCREMENT PRIMARY KEY,
          experiment_id INT,
          flight_date DATE,
          ndvi_mean FLOAT,
          coverage_index FLOAT,
          plant_height_m FLOAT,
          stand_plants_per_ha INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        )
      `);

      // Clima
      await pool.query(`
        CREATE TABLE IF NOT EXISTS climate_daily (
          id INT AUTO_INCREMENT PRIMARY KEY,
          station_code VARCHAR(50) DEFAULT 'PADRAO',
          date DATE UNIQUE,
          rain_mm FLOAT,
          tmean_c FLOAT,
          tmax_c FLOAT,
          tmin_c FLOAT,
          rh_mean FLOAT
        )
      `);

      // Colheita
      await pool.query(`
        CREATE TABLE IF NOT EXISTS harvest_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          experiment_id INT,
          plot_code VARCHAR(50),
          block_number INT,
          harvest_date DATE,
          total_weight FLOAT,
          commercial_roots INT,
          quality_score INT,
          FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        )
      `);

      // Intervenções
      await pool.query(`
        CREATE TABLE IF NOT EXISTS interventions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          experiment_id INT,
          intervention_date DATE,
          intervention_type VARCHAR(100),
          product VARCHAR(255),
          notes TEXT,
          FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
        )
      `);

      console.log('✅ Banco de dados (MariaDB) inicializado com todas as tabelas.');
    } catch (e) {
      console.error('❌ Erro ao inicializar banco:', e);
    }
  };
  initDb();

  // Função para construir clauses WHERE para MySQL
  function buildWhere(filters: any[], params: any[]) {
    if (!filters || filters.length === 0) return '';
    const conds = filters.map(f => {
      if (f.op === 'is') {
        if (f.val === null) return `\`${f.col}\` IS NULL`;
        params.push(f.val);
        return `\`${f.col}\` = ?`;
      }
      if (f.op === 'in') {
        params.push(f.val);
        return `\`${f.col}\` IN (?)`;
      }
      params.push(f.val);
      if (f.op === 'eq') return `\`${f.col}\` = ?`;
      if (f.op === 'gte') return `\`${f.col}\` >= ?`;
      if (f.op === 'lte') return `\`${f.col}\` <= ?`;
      return `\`${f.col}\` = ?`;
    });
    return ' WHERE ' + conds.join(' AND ');
  }

  // --- Rotas de Autenticação ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
      // Verificar se é o primeiro usuário
      const [countRows]: any = await pool.query('SELECT COUNT(*) as count FROM users');
      const isFirst = countRows[0].count === 0;

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (email, password, is_approved, role) VALUES (?, ?, ?, ?)', 
        [email, hashedPassword, isFirst ? 1 : 0, isFirst ? 'admin' : 'user']
      );
      
      res.json({ 
        success: true, 
        message: isFirst ? 'Admin criado!' : 'Cadastro enviado! Aguarde a aprovação do administrador.' 
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao cadastrar ou e-mail já existe.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      const user = rows[0];
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }

      if (!user.is_approved) {
        return res.status(403).json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ data: { session: { access_token: token, user: { id: user.id, email: user.email, role: user.role } } } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Rotas de Admin (Protegidas) ---
  app.get('/api/admin/users', async (req, res) => {
    // Aqui idealmente teríamos o middleware authenticateToken e checagem de role admin
    try {
      const [rows]: any = await pool.query('SELECT id, email, is_approved, role, created_at FROM users ORDER BY created_at DESC');
      res.json({ data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/approve', async (req, res) => {
    const { userId, approve } = req.body;
    try {
      if (approve) {
        await pool.query('UPDATE users SET is_approved = 1 WHERE id = ?', [userId]);
      } else {
        await pool.query('DELETE FROM users WHERE id = ?', [userId]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Middleware de proteção
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Token inválido' });
      req.user = user;
      next();
    });
  };

  // --- Rota de Query Protegida ---
  app.post('/api/query', authenticateToken, async (req, res) => {
    const { table, method, select, filters, order, limit,
            single, maybeSingle, body, upsert, onConflict,
            ignoreDuplicates, count, head } = req.body;
    try {
      if (method === 'GET') {
        const params: any[] = [];
        if (head && count === 'exact') {
          const sql = `SELECT COUNT(*) as count FROM \`${table}\`` + buildWhere(filters, params);
          const [rows]: any = await pool.query(sql, params);
          return res.json({ data: null, error: null, count: parseInt(rows[0].count) });
        }
        const cols = (select && select !== '*') ? select : '*';
        let sql = `SELECT ${cols} FROM \`${table}\`` + buildWhere(filters, params);
        if (order && order.length > 0)
          sql += ' ORDER BY ' + order.map((o: any) => `\`${o.col}\` ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
        if (limit) sql += ` LIMIT ${limit}`;
        const [rows]: any = await pool.query(sql, params);
        if (single) {
          if (rows.length === 0) return res.json({ data: null, error: { message: 'Nenhum registro encontrado.' } });
          return res.json({ data: rows[0], error: null });
        }
        if (maybeSingle) return res.json({ data: rows[0] || null, error: null });
        return res.json({ data: rows, error: null, count: rows.length });
      }

      if (method === 'POST') {
        const records = Array.isArray(body) ? body : [body];
        const results = [];
        for (const record of records) {
          const keys = Object.keys(record);
          const vals = Object.values(record);
          const cols = keys.map(k => `\`${k}\``).join(', ');
          const phs = vals.map(() => '?').join(', ');
          
          let sql = `INSERT INTO \`${table}\` (${cols}) VALUES (${phs})`;
          
          if (upsert && onConflict) {
            const cc = onConflict.split(',').map((s: string) => s.trim());
            sql += ` ON DUPLICATE KEY UPDATE `;
            const upd = keys.filter(k => !cc.includes(k));
            if (ignoreDuplicates || upd.length === 0) {
              // MySQL doesn't have a direct "DO NOTHING" like Postgres on Conflict
              // but we can use values of existing columns to keep them the same
              sql = `INSERT IGNORE INTO \`${table}\` (${cols}) VALUES (${phs})`;
            } else {
              sql += upd.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
            }
          }
          
          const [result]: any = await pool.query(sql, vals);
          // Return the inserted/updated record
          const [inserted]: any = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [result.insertId || record.id]);
          if (inserted[0]) results.push(inserted[0]);
        }
        return res.json({ data: results, error: null });
      }

      if (method === 'PATCH') {
        const keys = Object.keys(body);
        const vals = Object.values(body);
        const params: any[] = [...vals];
        let sql = `UPDATE \`${table}\` SET ` + keys.map((k) => `\`${k}\` = ?`).join(', ');
        sql += buildWhere(filters, params);
        await pool.query(sql, params);
        return res.json({ data: null, error: null });
      }

      if (method === 'DELETE') {
        const params: any[] = [];
        const sql = `DELETE FROM \`${table}\`` + buildWhere(filters, params);
        await pool.query(sql, params);
        return res.json({ data: null, error: null });
      }

      res.status(400).json({ data: null, error: { message: 'Método desconhecido: ' + method } });
    } catch (err: any) {
      console.error(`Erro [${method} ${table}]:`, err.message);
      res.json({ data: null, error: { message: err.message } });
    }
  });

  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
