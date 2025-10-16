import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        application_sessions (*)
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching application:', error)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error in get application API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating application:', error)
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error in update application API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting application:', error)
      return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Application deleted successfully' })
  } catch (error) {
    console.error('Error in delete application API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

