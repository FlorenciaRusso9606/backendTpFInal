
export interface NotificationCreatePayload {
    user_id: string
    sender_id?: string | null
    type: 'COMMENT' | 'FOLLOW' | 'MESSAGE' | 'REPORT' | 'LIKE_COMMENT' | 'LIKE_POST'
    ref_id?: string | null
    ref_type?: string | null
    message?: string
    metadata?: any
}

export interface Notification extends NotificationCreatePayload {
    id: string
    created_at: string
    is_seen: boolean
}
