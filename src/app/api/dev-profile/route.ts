import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 🚨 DEVELOPMENT ONLY API - DO NOT USE IN PRODUCTION
// This endpoint bypasses RLS using service role key

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev endpoint not available in production' }, { status: 403 })
  }
  
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Dev profile fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ profile: data })
    
  } catch (error) {
    console.error('Dev profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev endpoint not available in production' }, { status: 403 })
  }
  
  try {
    const { userId, profileData } = await request.json()
    
    if (!userId || !profileData) {
      return NextResponse.json({ error: 'userId and profileData required' }, { status: 400 })
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // First try to get existing profile
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (existing) {
      return NextResponse.json({ profile: existing })
    }
    
    // Create new profile
    const permissions = getPermissionsForRole(profileData.role || 'viewer')
    
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: profileData.email,
        full_name: profileData.fullName,
        avatar_url: profileData.avatarUrl,
        role: profileData.role,
        permissions,
        organization_id: profileData.organizationId,
        is_active: profileData.isActive
      })
      .select()
      .single()
    
    if (error) {
      console.error('Dev profile creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ profile: data })
    
  } catch (error) {
    console.error('Dev profile creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getPermissionsForRole(role: string): string[] {
  const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: [
      "create_projects", "edit_projects", "delete_projects",
      "create_ideas", "edit_ideas", "delete_ideas",
      "manage_risks", "view_budget", "edit_budget",
      "export_data", "manage_users", "view_analytics"
    ],
    manager: [
      "create_projects", "edit_projects",
      "create_ideas", "edit_ideas",
      "manage_risks", "view_budget", "edit_budget",
      "export_data", "view_analytics"
    ],
    analyst: [
      "create_ideas", "edit_ideas",
      "manage_risks", "view_budget",
      "export_data"
    ],
    viewer: [
      "view_budget", "export_data"
    ]
  }
  
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer
}