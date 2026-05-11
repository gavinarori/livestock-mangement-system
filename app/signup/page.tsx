

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignupForm } from '@/components/auth/signup-form'
import { Leaf } from 'lucide-react'

export const metadata = {
  title: 'Create Account — HerdWise Enterprise',
  description: 'Create an account to manage your livestock'
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full -translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="w-full max-w-md relative animate-scale-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Leaf className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-lg text-foreground leading-none">HerdWise</p>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Enterprise</p>
          </div>
        </div>

        <Card className="border-border shadow-xl shadow-foreground/5 rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">Create your account</CardTitle>
            <CardDescription>Start managing your livestock operation today</CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sustainable livestock management for modern farms
        </p>
      </div>
    </main>
  )
}
