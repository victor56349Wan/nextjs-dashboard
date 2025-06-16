'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
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
      if (!val) return true // Allow empty value
      // Check if it's a relative path or valid URL
      return (
        val.startsWith('/') ||
        val.startsWith('http://') ||
        val.startsWith('https://')
      )
    }, 'Please enter a valid URL or relative path starting with /')
    .optional(),
})

const CreateCustomer = CustomerSchema.omit({ id: true })

// Password strength validation regular expressions
const passwordRegex = {
  number: /\d/,
  upper: /[A-Z]/,
  lower: /[a-z]/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
}

// Function to build basic user schema
const createBasicUserSchema = () =>
  z.object({
    id: z.string(),
    name: z.string({
      invalid_type_error: 'Please enter a name',
      required_error: 'Name is required',
    }),
    email: z
      .string({
        invalid_type_error: 'Please enter an email',
        required_error: 'Email is required',
      })
      .email('Please enter a valid email address'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters')
      .regex(passwordRegex.number, 'Password must contain a number')
      .regex(passwordRegex.upper, 'Password must contain an uppercase letter')
      .regex(passwordRegex.lower, 'Password must contain a lowercase letter')
      .regex(
        passwordRegex.special,
        'Password must contain a special character'
      ),
    passwordConfirm: z.string({
      required_error: 'Please confirm password',
    }),
    address: z.string().optional(),
  })

// Base User Schema
const UserSchema = createBasicUserSchema().refine(
  (data) => data.password === data.passwordConfirm,
  {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  }
)

// When updating user, all password-related fields are optional
const UpdateUserSchema = z
  .object({
    ...createBasicUserSchema().shape,
    currentPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password || data.passwordConfirm || data.currentPassword) {
      if (!data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Current password is required when changing password',
          path: ['currentPassword'],
        })
      }
      if (!data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter new password',
          path: ['password'],
        })
      }
      if (!data.passwordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please confirm new password',
          path: ['passwordConfirm'],
        })
      }
      if (
        data.password &&
        data.passwordConfirm &&
        data.password !== data.passwordConfirm
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Passwords do not match',
          path: ['passwordConfirm'],
        })
      }
    }
  })

// Schema for creating user (without id)
const CreateUser = createBasicUserSchema().omit({ id: true })

// 更新用户时的 Schema (不包含 id)
const UpdateUser = z
  .object({
    ...UpdateUserSchema.shape,
  })
  .omit({ id: true })
  .partial()

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

export async function createUser(formData: FormData) {
  const { name, email, password, address } = CreateUser.parse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
    address: formData.get('address'),
  })

  try {
    // 对密码进行哈希处理
    const hashedPassword = await bcrypt.hash(password, 10)

    await sql`
      INSERT INTO users (name, email, password, address)
      VALUES (${name}, ${email}, ${hashedPassword}, ${address || null})
    `
  } catch (error) {
    console.error('Database Error: Failed to create user, error: ', error)
  }

  revalidatePath('/dashboard/users')
  redirect('/dashboard/users')
}

export async function updateUser(id: string, formData: FormData) {
  // 首先获取用户当前的数据作为默认值
  const currentUser = await sql<
    { name: string; email: string; address: string | null }[]
  >`
    SELECT name, email, address FROM users WHERE id = ${id}
  `

  if (!currentUser.length) {
    throw new Error('User not found')
  }

  const current = currentUser[0]

  const rawFormData = {
    name: formData.get('name')?.toString(),
    email: formData.get('email')?.toString(),
    currentPassword: formData.get('currentPassword')?.toString(),
    password: formData.get('password')?.toString(),
    passwordConfirm: formData.get('passwordConfirm')?.toString(),
    address: formData.get('address')?.toString(),
  }

  console.log('Raw form data:', rawFormData)

  // 过滤出需要更新的字段
  const updateFields = []
  const values = []
  let fieldIndex = 1

  // 检查并添加每个字段
  if (rawFormData.name && rawFormData.name !== current.name) {
    updateFields.push(`name = $${fieldIndex}`)
    values.push(rawFormData.name)
    fieldIndex++
    console.log('Will update name to:', rawFormData.name)
  }

  if (rawFormData.email && rawFormData.email !== current.email) {
    // Validate email format
    if (!rawFormData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid email format')
    }
    updateFields.push(`email = $${fieldIndex}`)
    values.push(rawFormData.email)
    fieldIndex++
    console.log('Will update email to:', rawFormData.email)
  }

  if (rawFormData.address && rawFormData.address !== current.address) {
    updateFields.push(`address = $${fieldIndex}`)
    values.push(rawFormData.address)
    fieldIndex++
    console.log('Will update address to:', rawFormData.address)
  }

  // 检查密码更新
  if (rawFormData.password) {
    // 密码相关的验证逻辑保持不变
    const user = await sql<{ password: string }[]>`
      SELECT password FROM users WHERE id = ${id}
    `

    if (!user.length) {
      throw new Error('User not found')
    }

    if (!rawFormData.currentPassword) {
      throw new Error('Current password is required to change password')
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      rawFormData.currentPassword,
      user[0].password
    )
    if (!isValid) {
      throw new Error('Incorrect current password')
    }

    // 对新密码进行哈希处理
    const hashedPassword = await bcrypt.hash(rawFormData.password, 10)
    updateFields.push(`password = $${fieldIndex}`)
    values.push(hashedPassword)
    fieldIndex++
  }

  console.log('Update info:', {
    updateFields,
    values,
  })

  if (updateFields.length > 0) {
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${fieldIndex}
    `
    values.push(id)

    console.log('Executing update query:', {
      query,
      values,
    })

    try {
      await sql.unsafe(query, values)
      console.log('Update successful')
    } catch (error) {
      console.error('SQL Error:', error)
      throw new Error('Database update failed')
    }
  } else {
    console.log('No fields to update')
  }

  revalidatePath('/dashboard/users')
  redirect('/dashboard/users')
}

export async function deleteUser(id: string) {
  try {
    await sql`DELETE FROM users WHERE id = ${id}`
    revalidatePath('/dashboard/users')
    redirect('/dashboard/users')
  } catch (error) {
    console.error('Database Error: Failed to delete user, error: ', error)
  }
}
