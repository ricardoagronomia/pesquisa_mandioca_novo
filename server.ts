import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Pool de conexão PostgreSQL
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pesquisa_db',
  });

  // Criar tabelas se não existirem (PostgreSQL)
  const initDb = async () => {
    try {
      // Experimentos
      await pool.query(`
        CREATE TABLE IF NOT EXISTS experiments (
          id SERIAL PRIMARY KEY,
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
          id SERIAL PRIMARY KEY,
          experiment_id INT REFERENCES experiments(id) ON DELETE CASCADE,
          plot_code VARCHAR(50),
          block_number INT,
          monitoring_date DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Biometria
      await pool.query(`
        CREATE TABLE IF NOT EXISTS plant_biometrics (
          id SERIAL PRIMARY KEY,
          monitoring_event_id INT REFERENCES monitoring_events(id) ON DELETE CASCADE,
          plant_position INT,
          has_sprouted BOOLEAN DEFAULT FALSE,
          is_reference_plant BOOLEAN DEFAULT FALSE,
          stem_count INT,
          sanity_score FLOAT,
          sanity_observations TEXT
        )
      `);

      // Mediçoes de hastes
      await pool.query(`
        CREATE TABLE IF NOT EXISTS plant_stem_measurements (
          id SERIAL PRIMARY KEY,
          biometric_id INT REFERENCES plant_biometrics(id) ON DELETE CASCADE,
          stem_number INT,
          height_cm FLOAT,
          diameter_cm FLOAT
        )
      `);

      // Drone
      await pool.query(`
        CREATE TABLE IF NOT EXISTS drone_monitoring (
          id SERIAL PRIMARY KEY,
          experiment_id INT REFERENCES experiments(id) ON DELETE CASCADE,
          flight_date DATE,
          ndvi_mean FLOAT,
          coverage_index FLOAT,
          plant_height_m FLOAT,
          stand_plants_per_ha INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Clima
      await pool.query(`
        CREATE TABLE IF NOT EXISTS climate_daily (
          id SERIAL PRIMARY KEY,
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
          id SERIAL PRIMARY KEY,
          experiment_id INT REFERENCES experiments(id) ON DELETE CASCADE,
          plot_code VARCHAR(50),
          block_number INT,
          harvest_date DATE,
          total_weight FLOAT,
          commercial_roots INT,
          quality_score INT
        )
      `);

      // Intervenções
      await pool.query(`
        CREATE TABLE IF NOT EXISTS interventions (
          id SERIAL PRIMARY KEY,
          experiment_id INT REFERENCES experiments(id) ON DELETE CASCADE,
          intervention_date DATE,
          intervention_type VARCHAR(100),
          product VARCHAR(255),
          notes TEXT
        )
      `);

      console.log('✅ Banco de dados (PostgreSQL) inicializado.');
    } catch (e) {
      console.error('❌ Erro ao inicializar banco:', e);
    }
  };
  initDb();

  // Função para construir clauses WHERE para PostgreSQL
  function buildWhere(filters: any[], params: any[]) {
    if (!filters || filters.length === 0) return '';
    const conds = filters.map(f => {
      const idx = params.push(f.val);
      if (f.op === 'is') {
        if (f.val === null) return `"${f.col}" IS NULL`;
        return `"${f.col}" = $${idx}`;
      }
      if (f.op === 'in') {
        // Envolve array para PostgreSQL ANY($idx)
        return `"${f.col}" = ANY($${idx})`;
      }
      if (f.op === 'eq') return `"${f.col}" = $${idx}`;
      if (f.op === 'gte') return `"${f.col}" >= $${idx}`;
      if (f.op === 'lte') return `"${f.col}" <= $${idx}`;
      return `"${f.col}" = $${idx}`;
    });
    return ' WHERE ' + conds.join(' AND ');
  }

  app.post('/api/query', async (req, res) => {
    const { table, method, select, filters, order, limit,
            single, maybeSingle, body, upsert, onConflict,
            ignoreDuplicates, count, head } = req.body;
    try {
      if (method === 'GET') {
        const params: any[] = [];
        if (head && count === 'exact') {
          const sql = `SELECT COUNT(*) FROM "${table}"` + buildWhere(filters, params);
          const r = await pool.query(sql, params);
          return res.json({ data: null, error: null, count: parseInt(r.rows[0].count) });
        }
        const cols = (select && select !== '*') ? select : '*';
        let sql = `SELECT ${cols} FROM "${table}"` + buildWhere(filters, params);
        if (order && order.length > 0)
          sql += ' ORDER BY ' + order.map((o: any) => `"${o.col}" ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
        if (limit) sql += ` LIMIT ${limit}`;
        const r = await pool.query(sql, params);
        if (single) {
          if (r.rows.length === 0) return res.json({ data: null, error: { message: 'Nenhum registro encontrado.' } });
          return res.json({ data: r.rows[0], error: null });
        }
        if (maybeSingle) return res.json({ data: r.rows[0] || null, error: null });
        return res.json({ data: r.rows, error: null, count: r.rows.length });
      }

      if (method === 'POST') {
        const records = Array.isArray(body) ? body : [body];
        const results = [];
        for (const record of records) {
          const keys = Object.keys(record);
          const vals = Object.values(record);
          const cols = keys.map(k => `"${k}"`).join(', ');
          const phs = vals.map((_, i) => `$${i + 1}`).join(', ');
          
          let sql = `INSERT INTO "${table}" (${cols}) VALUES (${phs})`;
          
          if (upsert && onConflict) {
            const cc = onConflict.split(',').map((s: string) => s.trim());
            sql += ` ON CONFLICT (${cc.map(c => `"${c}"`).join(', ')}) DO `;
            const upd = keys.filter(k => !cc.includes(k));
            if (ignoreDuplicates || upd.length === 0) {
              sql += 'NOTHING';
            } else {
              sql += 'UPDATE SET ' + upd.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
            }
          }
          sql += ' RETURNING *';
          const r = await pool.query(sql, vals);
          if (r.rows[0]) results.push(r.rows[0]);
        }
        return res.json({ data: results, error: null });
      }

      if (method === 'PATCH') {
        const keys = Object.keys(body);
        const vals = Object.values(body);
        let sql = `UPDATE "${table}" SET ` + keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        sql += buildWhere(filters, vals);
        await pool.query(sql, vals);
        return res.json({ data: null, error: null });
      }

      if (method === 'DELETE') {
        const params: any[] = [];
        const sql = `DELETE FROM "${table}"` + buildWhere(filters, params);
        await pool.query(sql, params);
        return res.json({ data: null, error: null });
      }

      res.status(400).json({ data: null, error: { message: 'Método desconhecido: ' + method } });
    } catch (err: any) {
      console.error(`Erro [${method} ${table}]:`, err.message);
      res.json({ data: null, error: { message: err.message } });
    }
  });

  // Vite middleware
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
