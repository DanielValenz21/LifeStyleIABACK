// src/routes/plans.js
const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Gestión de planes de estilo de vida
 */

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Lista todos los planes del usuario autenticado
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array de planes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   parameters:
 *                     type: object
 *                   status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno
 */
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, parameters, status, created_at, updated_at
       FROM plans
       WHERE user_id = ?`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar planes' });
  }
});

/**
 * @swagger
 * /plans:
 *   post:
 *     summary: Crea un nuevo plan (draft) para el usuario autenticado
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Mi primer plan
 *               parameters:
 *                 type: object
 *                 example:
 *                   Profesional: "Avanzar en mi carrera"
 *                   Nutrición: "Dieta balanceada"
 *     responses:
 *       201:
 *         description: Plan creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 parameters:
 *                   type: object
 *                 status:
 *                   type: string
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno
 */
router.post('/', auth, async (req, res) => {
  const { title = null, parameters = {} } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO plans (user_id, title, parameters)
       VALUES (?, ?, ?)`,
      [req.user.userId, title, JSON.stringify(parameters)]
    );
    const insertedId = result.insertId;
    res.status(201).json({
      id: insertedId,
      title,
      parameters,
      status: 'draft'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

module.exports = router;
