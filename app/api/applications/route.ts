import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    const requiredFields = ['student_name', 'student_email', 'student_phone', 'start_date', 'time_slot']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Create the application
    const applicationData = {
      student_name: body.student_name,
      student_email: body.student_email,
      student_phone: body.student_phone,
      notes: body.notes || null,
      start_date: body.start_date,
      time_slot: body.time_slot,
      sessions_per_week: body.sessions_per_week || 3,
      total_sessions: body.total_sessions || 12,
      status: 'pending',
      payment_status: 'pending'
    }

    const { data: application, error } = await supabase
      .from('applications')
      .insert([applicationData])
      .select()
      .single()

    if (error) {
      console.error('Error creating application:', error)
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    // Generate session schedule
    await generateSessionSchedule(application.id, body.start_date, body.sessions_per_week || 3, body.total_sessions || 12)

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Error in create application API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateSessionSchedule(applicationId: string, startDate: string, sessionsPerWeek: number, totalSessions: number) {
  const sessions = []
  const start = new Date(startDate)
  
  // Generate sessions based on the pattern
  let currentDate = new Date(start)
  let sessionNumber = 1
  
  while (sessionNumber <= totalSessions) {
    // Add session
    sessions.push({
      application_id: applicationId,
      session_number: sessionNumber,
      scheduled_date: currentDate.toISOString().split('T')[0],
      status: 'scheduled'
    })
    
    sessionNumber++
    
    // Calculate next session date based on sessions per week
    if (sessionsPerWeek === 3) {
      // Pattern: Session → Day Off → Session (Sundays excluded)
      currentDate.setDate(currentDate.getDate() + 2)
      
      // Skip Sundays
      if (currentDate.getDay() === 0) {
        currentDate.setDate(currentDate.getDate() + 1)
      }
    } else if (sessionsPerWeek === 2) {
      // Pattern: Session → 2 Days Off → Session
      currentDate.setDate(currentDate.getDate() + 3)
      
      // Skip Sundays
      if (currentDate.getDay() === 0) {
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
  }
  
  // Insert all sessions
  const { error } = await supabase
    .from('application_sessions')
    .insert(sessions)
  
  if (error) {
    console.error('Error creating session schedule:', error)
  }
}

