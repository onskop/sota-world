import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_USER_SETTINGS, UserSettings } from '@/lib/supabase/types'

// GET - Fetch personal settings for the user
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

    // Extract personal settings from preferences, use defaults if not set
    const preferences = profile?.preferences as Record<string, unknown> || {}
    const personalSettings = (preferences.personal as UserSettings) || DEFAULT_USER_SETTINGS

    return NextResponse.json({ settings: personalSettings })
  } catch (error) {
    console.error('Personal settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update personal settings
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

    const { voiceLanguage } = body

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
    const currentPersonalSettings = (currentPreferences.personal as UserSettings) || DEFAULT_USER_SETTINGS

    // Merge updates with current settings
    const updatedPersonalSettings: UserSettings = {
      ...currentPersonalSettings,
      ...(voiceLanguage !== undefined && { voiceLanguage }),
    }

    // Update preferences with new personal settings
    const updatedPreferences = {
      ...currentPreferences,
      personal: updatedPersonalSettings,
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating personal settings:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: updatedPersonalSettings })
  } catch (error) {
    console.error('Personal settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
