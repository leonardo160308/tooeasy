// backend/models/TicketModel.js
import { supabaseAdmin } from '../config/supabase.js';

class TicketModel {

    // ========================================
    // TICKETS
    // ========================================

    static async createTicket(userId, { subject, description, type, priority }) {
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .insert({ user_id: userId, subject, description, type, priority })
            .select()
            .single();
        if (error) throw error;

        await supabaseAdmin.from('ticket_events').insert({
            ticket_id: data.id,
            actor_id:  userId,
            type:      'created',
            data:      { subject, type, priority }
        });

        return data;
    }

    static async getTicketById(ticketId) {
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .select(`
                *,
                ticket_user:users!user_id(id, nombre, email),
                assignee:users!assigned_to(id, nombre, email)
            `)
            .eq('id', ticketId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    static async getTicketsByUser(userId) {
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .select('id, subject, type, priority, status, created_at, updated_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    static async getAllTickets(filters = {}) {
        let query = supabaseAdmin
            .from('support_tickets')
            .select(`
                *,
                ticket_user:users!user_id(id, nombre, email),
                assignee:users!assigned_to(id, nombre, email)
            `)
            .order('created_at', { ascending: false });

        if (filters.status)      query = query.eq('status', filters.status);
        if (filters.priority)    query = query.eq('priority', filters.priority);
        if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async updateTicketStatus(ticketId, newStatus, actorId) {
        const { data: prev } = await supabaseAdmin
            .from('support_tickets')
            .select('status')
            .eq('id', ticketId)
            .single();

        const updatePayload = {
            status:     newStatus,
            updated_at: new Date().toISOString()
        };
        if (newStatus === 'closed' || newStatus === 'resolved') {
            updatePayload.closed_at = new Date().toISOString();
        }

        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .update(updatePayload)
            .eq('id', ticketId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        await supabaseAdmin.from('ticket_events').insert({
            ticket_id: ticketId,
            actor_id:  actorId,
            type:      'status_changed',
            data:      { from: prev?.status, to: newStatus }
        });

        return data;
    }

    static async assignTicket(ticketId, supportId) {
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .update({
                assigned_to: supportId,
                status:      'in_progress',
                updated_at:  new Date().toISOString()
            })
            .eq('id', ticketId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        await supabaseAdmin.from('ticket_events').insert({
            ticket_id: ticketId,
            actor_id:  supportId,
            type:      'assigned',
            data:      { assigned_to: supportId }
        });

        return data;
    }

    // ========================================
    // MENSAJES
    // ========================================

    static async addMessage(ticketId, senderId, senderRole, message, isInternal = false) {
        const { data, error } = await supabaseAdmin
            .from('ticket_messages')
            .insert({
                ticket_id:   ticketId,
                sender_id:   senderId,
                sender_role: senderRole,
                message,
                is_internal: isInternal
            })
            .select()
            .single();
        if (error) throw error;

        await supabaseAdmin.from('ticket_events').insert({
            ticket_id: ticketId,
            actor_id:  senderId,
            type:      'message_sent',
            data:      { is_internal: isInternal, sender_role: senderRole }
        });

        return data;
    }

    static async getMessages(ticketId, requesterRole) {
        let query = supabaseAdmin
            .from('ticket_messages')
            .select('*, sender:sender_id(id, nombre, role)')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (requesterRole === 'user') {
            query = query.eq('is_internal', false);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    // ========================================
    // EVENTOS
    // ========================================

    static async getEvents(ticketId) {
        const { data, error } = await supabaseAdmin
            .from('ticket_events')
            .select('*, actor:actor_id(id, nombre, role)')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    static async closeTicket(ticketId, actorId) {
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .update({
                status:     'closed',
                closed_at:  new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', ticketId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        await supabaseAdmin.from('ticket_events').insert({
            ticket_id: ticketId,
            actor_id:  actorId,
            type:      'closed',
            data:      {}
        });

        return data;
    }
}

export default TicketModel;
