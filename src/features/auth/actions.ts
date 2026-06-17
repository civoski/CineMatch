'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const full_name = formData.get('full_name') as string

    // Redirección al endpoint que valida el token_hash con verifyOtp (flujo stateless)
    const emailRedirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/app`

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name,
            },
            emailRedirectTo,
        }
    })

    if (error) {
        console.error('Signup error:', error)
        return { error: error.message }
    }

    revalidatePath('/', 'layout')

    // Si el usuario necesita confirmar su email, redirigir a la pantalla de confirmación correcta
    if (data.user && !data.session) {
        redirect(`/confirm-email?email=${encodeURIComponent(email)}`)
    }

    // Si ya tiene sesión (email confirmado automáticamente o dev environment), ir a la app
    redirect('/app')
}

// Server Action para recuperar contraseña
export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/auth/update-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    })

    if (error) {
        console.error('Reset password error:', error)
        return { error: error.message }
    }

    return { success: 'Se ha enviado un enlace de recuperación a tu correo.' }
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string

    const { error } = await supabase.auth.updateUser({
        password
    })

    if (error) {
        return { error: error.message }
    }

    redirect('/app')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
