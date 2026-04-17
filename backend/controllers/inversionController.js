// backend/controllers/inversionController.js
import InversionModel from '../models/InversionModel.js';

export async function getSettings(req, res) {
    try {
        const data = await InversionModel.getSettings(req.params.userId);
        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener configuración.' });
    }
}

export async function updateSettings(req, res) {
    try {
        const { inflacion } = req.body;
        if (inflacion === undefined || inflacion < 0 || inflacion > 25) {
            return res.status(400).json({ success: false, message: 'Inflación inválida (0–25%).' });
        }
        const data = await InversionModel.upsertSettings(req.params.userId, inflacion);
        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al guardar configuración.' });
    }
}

export async function getHistorial(req, res) {
    try {
        const data = await InversionModel.getHistorial(req.params.userId);
        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener historial.' });
    }
}

export async function getSimulacion(req, res) {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ success: false, message: 'userId requerido.' });
        const data = await InversionModel.getSimulacion(req.params.id, userId);
        if (!data) return res.status(404).json({ success: false, message: 'Simulación no encontrada.' });
        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener simulación.' });
    }
}

export async function saveSimulacion(req, res) {
    try {
        const { userId, simulacion, instrumentos } = req.body;
        if (!userId || !simulacion) {
            return res.status(400).json({ success: false, message: 'Datos incompletos.' });
        }
        const data = await InversionModel.saveSimulacion(userId, simulacion, instrumentos);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al guardar simulación.' });
    }
}

export async function deleteSimulacion(req, res) {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'userId requerido.' });
        await InversionModel.deleteSimulacion(req.params.id, userId);
        res.json({ success: true, message: 'Simulación eliminada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar simulación.' });
    }
}