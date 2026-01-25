import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_ROUTER_SETTINGS, RouterSettings } from '@/lib/supabase/types'

// GET - Fetch router settings for the user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Extract router settings from preferences, use defaults if not set
    const preferences = profile?.preferences as Record<string, unknown> || {}
    const routerSettings = (preferences.router as RouterSettings) || DEFAULT_ROUTER_SETTINGS

    return NextResponse.json({ settings: routerSettings })
  } catch (error) {
    console.error('Router settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update router settings
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { model, tools } = body

    // Get current profile preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    const currentPreferences = (profile?.preferences as Record<string, unknown>) || {}
    const currentRouterSettings = (currentPreferences.router as RouterSettings) || DEFAULT_ROUTER_SETTINGS

    // Merge updates with current settings
    const updatedRouterSettings: RouterSettings = {
      model: model || currentRouterSettings.model,
      tools: {
        add_to_list: {
          ...currentRouterSettings.tools.add_to_list,
          ...(tools?.add_to_list || {}),
        },
        create_task: {
          ...currentRouterSettings.tools.create_task,
          ...(tools?.create_task || {}),
        },
        save_to_inbox: {
          ...currentRouterSettings.tools.save_to_inbox,
          ...(tools?.save_to_inbox || {}),
        },
      },
    }

    // Update preferences with new router settings
    const updatedPreferences = {
      ...currentPreferences,
      router: updatedRouterSettings,
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating router settings:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: updatedRouterSettings })
  } catch (error) {
    console.error('Router settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
