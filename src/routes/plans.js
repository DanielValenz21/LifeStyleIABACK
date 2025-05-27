// src/routes/plans.js

const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const axios   = require('axios');
const PDFDocument = require('pdfkit');

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
  const { planId } = req.params;
  const userId     = req.user.userId;

  try {
    // 1) Validar plan
    const [plans] = await pool.query(
      'SELECT parameters FROM plans WHERE id = ? AND user_id = ?',
      [planId, userId]
    );
    if (!plans.length) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    const parameters = plans[0].parameters;

    // 2) Construir prompt que fuerce SOLO JSON
    const messages = [
      { role: 'system', content:
          'Eres un asistente que devuelve **solo** JSON puro, sin explicaciones ni etiquetas.' },
      { role: 'user', content:
          `Dado este JSON de parámetros: ${JSON.stringify(parameters)}, ` +
          `devuelve un array JSON con objetos que tengan "section_type" y "content" ` +
          `para estas secciones: Profesional, Entrenamiento, Hobbies, Nutrición, Bienestar.` }
    ];

    // 3) Llamar al proxy IA
    const API_BASE = `${req.protocol}://${req.get('host')}`;
    const aiRes = await axios.post(
      `${API_BASE}/ai/generate`,
      { model: 'deepseek-r1-distill-qwen-7b', messages },
      { headers: { Authorization: req.headers.authorization } }
    );

    // 4) Extraer y parsear SOLO el bloque JSON
    const raw = aiRes.data.choices[0].message.content;
    const match = raw.match(/\[.*\]/s);
    if (!match) {
      return res.status(500).json({
        error: 'Respuesta IA no contiene JSON',
        details: raw.slice(0,200)
      });
    }
    const sections = JSON.parse(match[0]);

    // 5) Insertar en BD
    await Promise.all(sections.map(sec =>
      pool.query(
        'INSERT INTO plan_sections (plan_id, section_type, content) VALUES (?, ?, ?)',
        [planId, sec.section_type, sec.content]
      )
    ));

    // 6) Devolver todas las secciones
    const [result] = await pool.query(
      'SELECT id, section_type, content, status, created_at, updated_at FROM plan_sections WHERE plan_id = ?',
      [planId]
    );
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar secciones', details: err.message });
  }
});

/**
 * @swagger
 * /plans/{planId}/sections/{sectionId}:
 *   patch:
 *     summary: Ajusta una sección concreta invocando a la IA
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
 *       - in: path
 *         name: sectionId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la sección
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *                 example: "Quiero más énfasis en la nutrición"
 *     responses:
 *       200:
 *         description: Sección ajustada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 section_type:
 *                   type: string
 *                 content:
 *                   type: string
 *                 status:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: El campo "comment" es obligatorio
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan o sección no encontrado
 *       500:
 *         description: Error interno
 */
router.patch('/:planId/sections/:sectionId', auth, async (req, res) => {
  const { planId, sectionId } = req.params;
  const { comment }           = req.body;
  const userId                = req.user.userId;

  if (!comment) {
    return res.status(400).json({ error: 'El campo "comment" es obligatorio' });
  }

  try {
    // 1) Validar plan y sección
    const [[plan]] = await pool.query(
      'SELECT id FROM plans WHERE id = ? AND user_id = ?',
      [planId, userId]
    );
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    const [[sec]] = await pool.query(
      'SELECT content FROM plan_sections WHERE id = ? AND plan_id = ?',
      [sectionId, planId]
    );
    if (!sec) {
      return res.status(404).json({ error: 'Sección no encontrada' });
    }

    // 2) Prompt de ajuste – solo JSON puro
    const messages = [
      { role: 'system', content:
          'Eres un asistente de ajustes que devuelve solo el texto ajustado, sin nada más.' },
      { role: 'user', content:
          `Texto original: "${sec.content}".\nComentarios: "${comment}".` }
    ];

    // 3) Llamar al proxy IA
    const API_BASE = `${req.protocol}://${req.get('host')}`;
    const aiRes = await axios.post(
      `${API_BASE}/ai/adjust`,
      { model: 'deepseek-r1-distill-qwen-7b', messages },
      { headers: { Authorization: req.headers.authorization } }
    );

    // 4) Obtener contenido limpio
    const newContent = aiRes.data.choices[0].message.content.trim();

    // 5) Actualizar BD
    await pool.query(
      `UPDATE plan_sections
         SET content = ?, status = 'adjusted', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newContent, sectionId]
    );

    // 6) Devolver sección actualizada
    const [[updated]] = await pool.query(
      'SELECT id, section_type, content, status, created_at, updated_at FROM plan_sections WHERE id = ?',
      [sectionId]
    );
    res.json(updated);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al ajustar sección', details: err.message });
  }
});

// ─── Fase 5.1: Generar y guardar resumen ejecutivo ───────────────────────────
/**
 * @swagger
 * /plans/{planId}/summary:
 *   post:
 *     summary: Genera y guarda un resumen ejecutivo de un plan
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
 *         description: Resumen generado y guardado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 executive_summary:
 *                   type: string
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *       500:
 *         description: Error interno
 */
router.post('/:planId/summary', auth, async (req, res) => {
  const planId = req.params.planId;
  const userId = req.user.userId;

  try {
    // 1) Traer plan y secciones
    const [[plan]] = await pool.query(
      'SELECT title, parameters FROM plans WHERE id = ? AND user_id = ?',
      [planId, userId]
    );
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

    const [sections] = await pool.query(
      'SELECT section_type, content FROM plan_sections WHERE plan_id = ?',
      [planId]
    );

    // 2) Construir prompt y llamar IA
    const messages = [
      {
        role: 'system',
        content:
          'Eres un asistente que crea un resumen ejecutivo de un plan. ' +
          'Devuelve solo un JSON con { title, executive_summary }.'
      },
      {
        role: 'user',
        content: `Plan: "${plan.title}". Parámetros: ${JSON.stringify(
          plan.parameters
        )}. Secciones: ${JSON.stringify(sections)}.`
      }
    ];

    const API_BASE = `${req.protocol}://${req.get('host')}`;
    const aiRes = await axios.post(
      `${API_BASE}/ai/generate`,
      { model: 'deepseek-r1-distill-qwen-7b', messages },
      { headers: { Authorization: req.headers.authorization } }
    );

    // 3) Parsear JSON del LLM
    const raw = aiRes.data.choices[0].message.content;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return res
        .status(500)
        .json({ error: 'IA no devolvió JSON válido', details: raw.slice(0,200) });
    }
    const { title, executive_summary } = JSON.parse(match[0]);

    // 4) Guardar en BD
    await pool.query(
      `INSERT INTO plan_summaries (plan_id, title, executive_summary)
         VALUES (?, ?, ?)`,
      [planId, title, executive_summary]
    );

    // 5) Responder al cliente
    res.json({ title, executive_summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar resumen', details: err.message });
  }
});

// ─── Fase 5.2: Exportar plan a PDF ─────────────────────────────────────────────
/**
 * @swagger
 * /plans/{planId}/export:
 *   get:
 *     summary: Devuelve un PDF con el plan completo
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
 *         description: PDF generado
 *         content:
 *           application/pdf: {}
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *       500:
 *         description: Error interno
 */
router.get('/:planId/export', auth, async (req, res) => {
  const planId = req.params.planId;
  const userId = req.user.userId;

  try {
    // 1) Datos del plan
    const [[plan]] = await pool.query(
      'SELECT title, status FROM plans WHERE id = ? AND user_id = ?',
      [planId, userId]
    );
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

    // 2) Secciones y último resumen
    const [sections] = await pool.query(
      'SELECT section_type, content FROM plan_sections WHERE plan_id = ?',
      [planId]
    );
    const [summaries] = await pool.query(
      'SELECT executive_summary FROM plan_summaries WHERE plan_id = ? ORDER BY id DESC LIMIT 1',
      [planId]
    );
    const executive = summaries[0]?.executive_summary || '';

    // 3) Generar PDF
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=plan-${planId}.pdf`,
          'Content-Length': pdfData.length
        })
        .end(pdfData);
    });

    // 4) Llenar PDF
    doc.fontSize(20).text(plan.title, { underline: true });
    doc.moveDown();
    doc.fontSize(14).text('Resumen Ejecutivo:', { bold: true });
    doc.fontSize(12).text(executive);
    doc.addPage();
    sections.forEach((s) => {
      doc.fontSize(16).text(s.section_type, { underline: true });
      doc.fontSize(12).text(s.content);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al exportar plan', details: err.message });
  }
});

module.exports = router;
