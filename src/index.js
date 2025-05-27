// src/index.js
require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const swaggerUi     = require('swagger-ui-express');
const swaggerJsdoc  = require('swagger-jsdoc');
const pool          = require('./config/db');

// Routers
const authRouter  = require('./routes/auth');
const plansRouter = require('./routes/plans');
const aiRouter = require('./routes/ai');
const remindersRouter = require('./routes/reminders');

const app = express();

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Swagger Setup ────────────────────────────────────────────────────────────
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Lifestyle Planner API',
    version: '1.0.0',
    description: 'Documentación Swagger para el backend de Lifestyle Planner',
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 4000}`,
      description: 'Servidor local'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/plans', plansRouter);
app.use('/ai', aiRouter);
app.use('/reminders', remindersRouter);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Comprueba que el servidor y la base de datos estén activos
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: OK
 *       500:
 *         description: Error de servidor o BD
 */
app.get('/api/health', async (_, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ status: 'OK', db: 'conectada' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

// ─── Inicio del servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en http://localhost:${PORT}`);
  console.log(`📚 Swagger UI disponible en http://localhost:${PORT}/api-docs`);
});
