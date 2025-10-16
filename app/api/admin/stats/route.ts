import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    // Get total applications
    const { count: totalApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })

    // Get applications by status
    const { count: pendingApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: confirmedApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')

    const { count: completedApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    const { count: cancelledApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')

    // Get this month's applications
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: thisMonthApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // Get this week's applications
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const { count: thisWeekApplications } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeek.toISOString())

    // Get pending payments
    const { count: pendingPayments } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending')

    // Calculate total revenue (assuming $60 per session for paid applications)
    const { data: paidApplications } = await supabaseAdmin
      .from('applications')
      .select('total_sessions')
      .eq('payment_status', 'paid')

    const totalRevenue = paidApplications?.reduce((sum, app) => sum + (app.total_sessions * 60), 0) || 0

    const stats = {
      total_applications: totalApplications || 0,
      pending_applications: pendingApplications || 0,
      confirmed_applications: confirmedApplications || 0,
      completed_applications: completedApplications || 0,
      cancelled_applications: cancelledApplications || 0,
      total_revenue: totalRevenue,
      pending_payments: pendingPayments || 0,
      this_month_applications: thisMonthApplications || 0,
      this_week_applications: thisWeekApplications || 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

