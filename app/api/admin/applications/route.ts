import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching applications:', error)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json(applications)
  } catch (error) {
    console.error('Error in applications API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error('Error creating application:', error)
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Error in create application API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

