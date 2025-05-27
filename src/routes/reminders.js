// src/routes/reminders.js
const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

/**
 * @swagger
 * /reminders/{id}:
 *   patch:
 *     summary: Activa/desactiva o cambia la regla de un recordatorio
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del recordatorio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rule:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Recordatorio actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 rule:
 *                   type: string
 *                 is_active:
 *                   type: boolean
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Nada para actualizar
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Recordatorio no encontrado
 *       500:
 *         description: Error interno
 */
router.patch('/:id', auth, async (req, res) => {
  const id        = req.params.id;
  const userId    = req.user.userId;
  const { rule, is_active } = req.body;

  // Validar body
  if (rule === undefined && is_active === undefined) {
    return res.status(400).json({ error: 'Nada para actualizar' });
  }

  try {
    // Verificar propiedad: unimos con plans
    const [[exists]] = await pool.query(
      `SELECT r.id 
         FROM plan_reminders r
         JOIN plans p ON r.plan_id = p.id
        WHERE r.id = ? AND p.user_id = ?`,
      [id, userId]
    );
    if (!exists) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    // Construir SET dinámico
    const fields = [];
    const values = [];
    if (rule !== undefined) {
      fields.push('rule = ?');
      values.push(rule);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(is_active);
    }
    values.push(id);

    // Ejecutar UPDATE
    await pool.query(
      `UPDATE plan_reminders
          SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      values
    );

    // Devolver actualizado
    const [[updated]] = await pool.query(
      `SELECT id, rule, is_active, created_at, updated_at
         FROM plan_reminders
        WHERE id = ?`,
      [id]
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar recordatorio' });
  }
});

/**
 * @swagger
 * /reminders/{id}:
 *   delete:
 *     summary: Elimina un recordatorio
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del recordatorio
 *     responses:
 *       204:
 *         description: Recordatorio eliminado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Recordatorio no encontrado
 *       500:
 *         description: Error interno
 */
router.delete('/:id', auth, async (req, res) => {
  const id     = req.params.id;
  const userId = req.user.userId;

  try {
    // Verificar propiedad
    const [[exists]] = await pool.query(
      `SELECT r.id 
         FROM plan_reminders r
         JOIN plans p ON r.plan_id = p.id
        WHERE r.id = ? AND p.user_id = ?`,
      [id, userId]
    );
    if (!exists) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    // Borrar
    await pool.query(
      `DELETE FROM plan_reminders WHERE id = ?`,
      [id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar recordatorio' });
  }
});

module.exports = router;
