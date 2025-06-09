'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import postgres from 'postgres'
import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    console.log('Authentication attempt:', formData)

    const result = await signIn('credentials', formData)

    if (result?.error) {
      console.error('Authentication error:', result.error)

      // Try to parse error message
      try {
        const errorData = JSON.parse(result.error)
        if (errorData.message) {
          return errorData.message
        }
      } catch {
        // If not JSON format, return error message directly
        return result.error
      }

      return 'Authentication failed, please try again later'
    }
  } catch (error: any) {
    console.error(
      'Authentication process error:',
      error,
      'type of error',
      typeof error
    )
    if (error instanceof AuthError) {
      // Access specific error properties
      console.log('type: ', error.type) // Error type
      console.log('msg: ', error.message) // Error message
      console.log('code: ', error.code) // Error code
      return (
        error.code || 'Authentication process error, please try again later'
      )
    }
    throw error
  }
}

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
})

const CreateInvoice = FormSchema.omit({ id: true, date: true })

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })
export async function createInvoice(formData: FormData) {
  console.log('create invoice')
  const rawFormData = {
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  }
  // Test it out:
  console.log(rawFormData)
  const { customerId, amount, status } = CreateInvoice.parse(rawFormData)
  const amountInCents = amount * 100
  const date = new Date().toISOString().split('T')[0]
  try {
    await sql`INSERT INTO invoices (customer_id, amount, status, date)
  VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`
  } catch (error) {
    console.log(error)
  }

  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')
}
// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  const amountInCents = amount * 100
  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `
  } catch (error) {
    // log error to console
    console.error(error)
  }

  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice')
  /* try {
    await sql`DELETE FROM invoices WHERE id = ${id}`
  } catch (error) {
    console.log(error)
  }
  revalidatePath('/dashboard/invoices') */
}
