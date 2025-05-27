// src/routes/ai.js

require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const auth    = require('../middleware/auth');
const router  = express.Router();

// Base URL de tu IA (DeepSeek local)
const AI_URL = process.env.AI_URL.replace(/\/$/, ''); // sin slash final

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: Proxies para generación y ajuste vía DeepSeek
 */

/**
 * @swagger
 * /ai/generate:
 *   post:
 *     summary: Proxy genérico a DeepSeek para prompts nuevos
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Cuerpo completo para el endpoint de chat/completions de DeepSeek
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               model: "deepseek-r1-distill-qwen-7b"
 *               messages:
 *                 - role: "system"
 *                   content: "Eres un asistente útil que responde en español."
 *                 - role: "user"
 *                   content: "Dame un plan de entrenamiento semanal."
 *     responses:
 *       200:
 *         description: Respuesta cruda de DeepSeek
 *       500:
 *         description: Error al conectar con IA
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const aiRes = await axios.post(
      `${AI_URL}/v1/chat/completions`,
      req.body
    );
    res.json(aiRes.data);
  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(500).json({ error: 'Error al generar con IA', details: err.message });
  }
});

/**
 * @swagger
 * /ai/adjust:
 *   post:
 *     summary: Proxy a DeepSeek para prompts de ajuste de secciones
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Cuerpo con el prompt de ajuste (sección + comentarios)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               model: "deepseek-r1-distill-qwen-7b"
 *               messages:
 *                 - role: "system"
 *                   content: "Eres un asistente de ajustes."
 *                 - role: "user"
 *                   content: "Ajusta este texto para que sea más conciso..."
 *     responses:
 *       200:
 *         description: Respuesta cruda de DeepSeek
 *       500:
 *         description: Error al conectar con IA
 */
router.post('/adjust', auth, async (req, res) => {
  try {
    const aiRes = await axios.post(
      `${AI_URL}/v1/chat/completions`,
      req.body
    );
    res.json(aiRes.data);
  } catch (err) {
    console.error('AI adjust error:', err.message);
    res.status(500).json({ error: 'Error al ajustar con IA', details: err.message });
  }
});

module.exports = router;
