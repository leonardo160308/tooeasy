// backend/models/TicketModel.js
import { supabaseAdmin } from '../config/supabase.js';

const SLA_HRS = {
    urgent: { response: 1,   resolution: 4   },
    high:   { response: 4,   resolution: 24  },
    medium: { response: 24,  resolution: 72  },
    low:    { response: 72,  resolution: 168 }
};

function slaDeadlines(priority) {
    const sla = SLA_HRS[priority] || SLA_HRS.medium;
    const now  = Date.now();
    return {
        response_deadline:   new Date(now + sla.response   * 3600000).toISOString(),
        resolution_deadline: new Date(now + sla.resolution * 3600000).toISOString()
    };
}

class TicketModel {

    // ========================================
    // TICKETS
    // ========================================

    static async createTicket(userId, { subject, description, type, module = 'otro', image_url = null }) {
        const priority  = 'low';
        const deadlines = slaDeadlines(priority);
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .insert({ user_id: userId, subject, description, type, priority, module, image_url, ...deadlines })
            .select()
            .single();
        if (error) throw error;

        await supabaseAdmin.from('ticket_events').insert({
            ticket_id: data.id,
            actor_id:  userId,
            type:      'created',
            data:      { subject, type, module }
        });

        return data;
    }

    static async updateTicketPriority(ticketId, priority, actorId) {
        const { data: prev } = await supabaseAdmin
            .from('support_tickets')
            .select('priority')
            .eq('id', ticketId)
            .single();

        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .update({ priority, updated_at: new Date().toISOString() })
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
            type:      'priority_changed',
            data:      { from: prev?.priority, to: priority }
        });

        return data;
    }

    static async getTicketById(ticketId) {
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .select(`
                *,
                ticket_user:user_id(id, nombre, email),
                assignee:assigned_to(id, nombre, email)
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
            .select('id, subject, type, priority, status, module, created_at, updated_at')
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
                ticket_user:user_id(id, nombre, email),
                assignee:assigned_to(id, nombre, email)
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

        // Registrar first_response_at la primera vez que soporte responde (no nota interna)
        if ((senderRole === 'support') && !isInternal) {
            const { data: tk } = await supabaseAdmin
                .from('support_tickets')
                .select('first_response_at')
                .eq('id', ticketId)
                .single();
            if (tk && !tk.first_response_at) {
                await supabaseAdmin
                    .from('support_tickets')
                    .update({ first_response_at: new Date().toISOString() })
                    .eq('id', ticketId);
            }
        }

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

    // ========================================
    // CSAT
    // ========================================

    static async submitCsat(ticketId, userId, rating, comment) {
        const { data, error } = await supabaseAdmin
            .from('ticket_csat')
            .upsert(
                { ticket_id: ticketId, user_id: userId, rating, comment },
                { onConflict: 'ticket_id' }
            )
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ========================================
    // MÉTRICAS
    // ========================================

    static async getMetrics() {
        const { data: tickets, error } = await supabaseAdmin
            .from('support_tickets')
            .select('status, priority, assigned_to, first_response_at, created_at, response_deadline');
        if (error) throw error;

        const now       = Date.now();
        const byStatus  = {};
        const byAgent   = {};
        let totalResponseMs   = 0;
        let countWithResponse = 0;

        for (const t of tickets) {
            byStatus[t.status] = (byStatus[t.status] || 0) + 1;
            if (t.assigned_to) byAgent[t.assigned_to] = (byAgent[t.assigned_to] || 0) + 1;
            if (t.first_response_at) {
                totalResponseMs += new Date(t.first_response_at) - new Date(t.created_at);
                countWithResponse++;
            }
        }

        const overdue = tickets.filter(t =>
            t.status !== 'closed' && t.status !== 'resolved' &&
            t.response_deadline && new Date(t.response_deadline).getTime() < now
        ).length;

        return {
            total:          tickets.length,
            byStatus,
            byAgent,
            avgResponseHrs: countWithResponse > 0 ? (totalResponseMs / countWithResponse) / 3600000 : null,
            overdue
        };
    }

    // ========================================
    // LIMPIEZA AUTOMÁTICA (30 días)
    // ========================================

    static async deleteExpiredTickets() {
        const cutoff = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

        const { data: expired, error: fetchError } = await supabaseAdmin
            .from('support_tickets')
            .select('id, image_url')
            .lt('created_at', cutoff);

        if (fetchError) throw fetchError;
        if (!expired || expired.length === 0) return { deleted: 0 };

        // Borrar imágenes de Supabase Storage (solo las que vengan de ahí)
        const storageNames = expired
            .filter(t => t.image_url?.startsWith('http'))
            .map(t => t.image_url.split('/').pop());
        if (storageNames.length > 0) {
            await supabaseAdmin.storage.from('tickets').remove(storageNames).catch(() => {});
        }

        const ids = expired.map(t => t.id);
        const { error: deleteError } = await supabaseAdmin
            .from('support_tickets')
            .delete()
            .in('id', ids);

        if (deleteError) throw deleteError;
        return { deleted: ids.length };
    }

    static async deleteTicket(ticketId) {
        const { data: ticket } = await supabaseAdmin
            .from('support_tickets')
            .select('id, image_url')
            .eq('id', ticketId)
            .single();

        const { error } = await supabaseAdmin
            .from('support_tickets')
            .delete()
            .eq('id', ticketId);

        if (error) throw error;
        return ticket;
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

    // ========================================
    // FAQ VIEWS
    // ========================================

    static async trackFaqView(faqKey) {
        const { data: existing } = await supabaseAdmin
            .from('faq_views')
            .select('id, views')
            .eq('faq_key', faqKey)
            .maybeSingle();

        if (existing) {
            await supabaseAdmin
                .from('faq_views')
                .update({ views: existing.views + 1, last_viewed_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabaseAdmin
                .from('faq_views')
                .insert({ faq_key: faqKey, views: 1, last_viewed_at: new Date().toISOString() });
        }
    }

    static async countUserTicketsThisMonth(userId) {
        const now        = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count, error } = await supabaseAdmin
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', monthStart);
        if (error) throw error;
        return count || 0;
    }

    static async getFaqStats() {
        const { data, error } = await supabaseAdmin
            .from('faq_views')
            .select('faq_key, views, last_viewed_at')
            .order('views', { ascending: false });
        if (error) throw error;
        return data || [];
    }
}

export default TicketModel;
