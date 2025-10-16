export interface Application {
  id: string
  created_at: string
  updated_at: string
  student_name: string
  student_email: string
  student_phone: string
  notes?: string
  start_date: string
  time_slot: string
  sessions_per_week: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  total_sessions: number
  completed_sessions: number
  payment_status: 'pending' | 'paid' | 'refunded'
  admin_notes?: string
  contact_attempts: number
  last_contact_date?: string
}

export interface ApplicationSession {
  id: string
  application_id: string
  session_number: number
  scheduled_date: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  notes?: string
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_applications: number
  pending_applications: number
  confirmed_applications: number
  completed_applications: number
  cancelled_applications: number
  total_revenue: number
  pending_payments: number
  this_month_applications: number
  this_week_applications: number
}

