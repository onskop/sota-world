import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-2xl font-display font-semibold text-white mb-2">
          Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
        </h2>
        <p className="text-slate-400">
          Your smart notepad is ready. Start capturing your thoughts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickActionCard
          title="New Note"
          description="Create a text note"
          icon="edit"
          href="/dashboard/notes/new"
        />
        <QuickActionCard
          title="Voice Command"
          description="Record and transcribe voice"
          icon="mic"
          href="/"
        />
        <QuickActionCard
          title="Browse Notes"
          description="View all your notes"
          icon="folder"
          href="/dashboard/notes"
        />
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-display font-medium text-white mb-4">
          Getting Started
        </h3>
        <ul className="space-y-3 text-slate-300">
          <li className="flex items-start gap-3">
            <span className="text-electric mt-0.5">1.</span>
            <span>Create your first note using text or voice</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-electric mt-0.5">2.</span>
            <span>Organize notes into categories</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-electric mt-0.5">3.</span>
            <span>Use AI actions to research, summarize, or manage your notes</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  icon,
  href,
}: {
  title: string
  description: string
  icon: 'edit' | 'mic' | 'folder'
  href: string
}) {
  const icons = {
    edit: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    mic: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    folder: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  }

  return (
    <a
      href={href}
      className="glass-card p-5 flex items-start gap-4 hover:border-electric/50 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-electric/10 text-electric group-hover:bg-electric/20 transition-colors">
        {icons[icon]}
      </div>
      <div>
        <h4 className="font-medium text-white">{title}</h4>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </a>
  )
}
