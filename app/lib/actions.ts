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
    console.log('认证尝试:', formData)

    /*     const result = await signIn('credentials', {
      ...Object.fromEntries(formData),
      redirect: false,
    }) */
    const result = await signIn('credentials', formData)

    if (result?.error) {
      console.error('认证错误:', result.error)

      // 尝试解析错误信息
      try {
        const errorData = JSON.parse(result.error)
        if (errorData.message) {
          return errorData.message
        }
      } catch {
        // 如果不是JSON格式，直接返回错误消息
        return result.error
      }

      return '认证失败，请稍后重试'
    }

    /*     // 认证成功后重定向
    const callbackUrl = formData.get('callbackUrl')
    if (callbackUrl) {
      redirect(callbackUrl as string)
    } else {
      redirect('/dashboard')
    } */
  } catch (error: any) {
    console.error('认证过程发生错误:', error, 'type of error', typeof error)
    if (error instanceof AuthError) {
      // 可以访问特定的错误属性
      console.log('type: ', error.type) // 错误类型
      console.log('msg: ', error.message) // 错误消息
      console.log('code: ', error.code) // 错误消息
    }
    return error.code || '认证过程中发生错误，请稍后重试'
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
