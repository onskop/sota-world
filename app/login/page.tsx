import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="main-wrapper flex flex-col items-center justify-center min-h-screen">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-semibold text-white mb-2">
            Smart Notepad
          </h1>
          <p className="text-slate-400">
            Your AI-powered personal knowledge hub
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-slate-500 text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  )
}
