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

/**
 * @swagger
 * /plans/{planId}:
 *   get:
 *     summary: Obtiene el detalle de un plan, incluidas sus secciones
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del plan
 *     responses:
 *       200:
 *         description: Detalle del plan con secciones
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
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 sections:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       section_type:
 *                         type: string
 *                       content:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *       500:
 *         description: Error interno
 */
router.get('/:planId', auth, async (req, res) => {
  const planId = req.params.planId;
  try {
    const [plans] = await pool.query(
      `SELECT id, title, parameters, status, created_at, updated_at
       FROM plans
       WHERE id = ? AND user_id = ?`,
      [planId, req.user.userId]
    );
    if (!plans.length) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    const plan = plans[0];
    const [sections] = await pool.query(
      `SELECT id, section_type, content, status, created_at, updated_at
       FROM plan_sections
       WHERE plan_id = ?`,
      [planId]
    );
    res.json({ ...plan, sections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalle del plan' });
  }
});

/**
 * @swagger
 * /plans/{planId}:
 *   patch:
 *     summary: Actualiza el título o parámetros de un plan
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del plan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Mi plan actualizado
 *               parameters:
 *                 type: object
 *                 example:
 *                   Profesional: "Nuevo objetivo profesional"
 *                   Nutrición: "Plan keto"
 *     responses:
 *       200:
 *         description: Plan actualizado correctamente
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
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Ningún campo para actualizar
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *       500:
 *         description: Error interno
 */
router.patch('/:planId', auth, async (req, res) => {
  const planId = req.params.planId;
  const { title, parameters } = req.body;
  const fields = [];
  const values = [];

  if (title !== undefined) {
    fields.push('title = ?');
    values.push(title);
  }
  if (parameters !== undefined) {
    fields.push('parameters = ?');
    values.push(JSON.stringify(parameters));
  }
  if (fields.length === 0) {
    return res.status(400).json({ error: 'Ningún campo para actualizar' });
  }

  try {
    // Verificar existencia del plan
    const [exists] = await pool.query(
      `SELECT id FROM plans WHERE id = ? AND user_id = ?`,
      [planId, req.user.userId]
    );
    if (!exists.length) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    // Ejecutar actualización
    await pool.query(
      `UPDATE plans SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      [...values, planId, req.user.userId]
    );

    // Obtener plan actualizado
    const [updated] = await pool.query(
      `SELECT id, title, parameters, status, created_at, updated_at
       FROM plans
       WHERE id = ?`,
      [planId]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
});

/**
 * @swagger
 * /plans/{planId}:
 *   delete:
 *     summary: Elimina un plan y sus datos asociados
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       204:
 *         description: Plan eliminado correctamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *       500:
 *         description: Error interno
 */
router.delete('/:planId', auth, async (req, res) => {
  const planId = req.params.planId;
  try {
    const [exists] = await pool.query(
      `SELECT id FROM plans WHERE id = ? AND user_id = ?`,
      [planId, req.user.userId]
    );
    if (!exists.length) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    await pool.query(
      `DELETE FROM plans WHERE id = ? AND user_id = ?`,
      [planId, req.user.userId]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar plan' });
  }
});

/**
 * @swagger
 * /plans/{planId}/sections:
 *   post:
 *     summary: Genera todas las secciones de un plan (invoca IA)
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Secciones generadas e insertadas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   section_type:
 *                     type: string
 *                   content:
 *                     type: string
 *                   status:
 *                     type: string
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *       500:
 *         description: Error interno
 */
router.post('/:planId/sections', auth, async (req, res) => {
  const planId = req.params.planId;

  // Verificar que el plan exista y pertenezca al usuario
  try {
    const [plans] = await pool.query(
      `SELECT id FROM plans WHERE id = ? AND user_id = ?`,
      [planId, req.user.userId]
    );
    if (!plans.length) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    // Tipos de sección estándar
    const sectionTypes = ['Profesional','Entrenamiento','Hobbies','Nutrición','Bienestar'];

    // Aquí iría la llamada a la IA para generar cada sección.
    // Por ahora, insertamos contenido placeholder vacío.
    const insertPromises = sectionTypes.map(type =>
      pool.query(
        `INSERT INTO plan_sections (plan_id, section_type, content)
         VALUES (?, ?, ?)`,
        [planId, type, `Contenido de ${type} generado por IA...`]
      )
    );
    await Promise.all(insertPromises);

    // Recuperar e indicar las secciones creadas
    const [sections] = await pool.query(
      `SELECT id, section_type, content, status, created_at, updated_at
       FROM plan_sections
       WHERE plan_id = ?`,
      [planId]
    );

    res.json(sections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar secciones del plan' });
  }
});

module.exports = router;
