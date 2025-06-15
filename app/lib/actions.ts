'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import postgres from 'postgres'
import { signIn } from '@/auth'
import { CredentialsSignin } from 'next-auth'
export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    console.log('Authentication attempt:', formData)

    const result = (await signIn('credentials', formData)) as any

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
    if (error instanceof CredentialsSignin) {
      // Access specific error propertie
      console.log('type: ', error.type) // Error type
      console.log('msg: ', error.message) // Error message
      console.log('code: ', error.code) // Error code
      // Return the error code directly as it contains our custom error message
      return error.code || 'Authentication failed'
    }
    /* 
    also an error in case of auth OK, log as below:
    ---
    Email auth - Authentication successful
    Authentication process error: Error: NEXT_REDIRECT
    ---
    just having to throw it will let the framework works well!
    */
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

const CustomerSchema = z.object({
  id: z.string(),
  name: z.string({
    invalid_type_error: 'Please enter a name.',
    required_error: 'Please enter a name.',
  }),
  email: z
    .string({
      invalid_type_error: 'Please enter an email.',
      required_error: 'Please enter an email.',
    })
    .email('Please enter a valid email address.'),
  image_url: z
    .string()
    .refine((val) => {
      if (!val) return true // 允许空值
      // 检查是否为相对路径或有效的 URL
      return (
        val.startsWith('/') ||
        val.startsWith('http://') ||
        val.startsWith('https://')
      )
    }, 'Please enter a valid URL or relative path starting with /')
    .optional(),
})

const CreateCustomer = CustomerSchema.omit({ id: true })

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
  //throw new Error('Failed to Delete Invoice')
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`
  } catch (error) {
    console.log(error)
  }
  revalidatePath('/dashboard/invoices')
}

export async function createCustomer(formData: FormData) {
  const { name, email, image_url } = CreateCustomer.parse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  })

  try {
    await sql`
      INSERT INTO customers (name, email, image_url)
      VALUES (${name}, ${email}, ${
      image_url || '/customers/default-avatar.png'
    })
    `
  } catch (error) {
    console.error('Database Error: Failed to create customer: ', error)
  }

  revalidatePath('/dashboard/customers')
  redirect('/dashboard/customers')
}

const UpdateCustomer = CustomerSchema.omit({ id: true })

export async function updateCustomer(id: string, formData: FormData) {
  const { name, email, image_url } = UpdateCustomer.parse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  })

  try {
    await sql`
      UPDATE customers
      SET name = ${name}, email = ${email}, image_url = ${
      image_url || '/customers/default-avatar.png'
    }
      WHERE id = ${id}
    `
  } catch (error) {
    // log error to console
    console.error('Database Error: Failed to update customer: ', error)
  }

  revalidatePath('/dashboard/customers')
  redirect('/dashboard/customers')
}

export async function deleteCustomer(id: string) {
  try {
    await sql`DELETE FROM customers WHERE id = ${id}`
  } catch (error) {
    console.error('Database Error: Failed to delete customer: ', error)
  }
  revalidatePath('/dashboard/customers')
}
