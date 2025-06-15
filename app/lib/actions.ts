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

// 密码强度校验的正则表达式
const passwordRegex = {
  number: /\d/,
  upper: /[A-Z]/,
  lower: /[a-z]/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
}

// 构建基本用户模式的函数
const createBasicUserSchema = () =>
  z.object({
    id: z.string(),
    name: z.string({
      invalid_type_error: '请输入用户姓名',
      required_error: '用户姓名不能为空',
    }),
    email: z
      .string({
        invalid_type_error: '请输入电子邮箱',
        required_error: '电子邮箱不能为空',
      })
      .email('请输入有效的电子邮箱地址'),
    password: z
      .string({
        required_error: '密码不能为空',
      })
      .min(8, '密码长度至少为8个字符')
      .regex(passwordRegex.number, '密码必须包含数字')
      .regex(passwordRegex.upper, '密码必须包含大写字母')
      .regex(passwordRegex.lower, '密码必须包含小写字母')
      .regex(passwordRegex.special, '密码必须包含特殊字符'),
    passwordConfirm: z.string({
      required_error: '请确认密码',
    }),
    address: z.string().optional(),
  })

// 基础用户 Schema
const UserSchema = createBasicUserSchema().refine(
  (data) => data.password === data.passwordConfirm,
  {
    message: '两次输入的密码不一致',
    path: ['passwordConfirm'],
  }
)

// 更新用户时的 Schema，密码相关字段都是可选的
const UpdateUserSchema = z
  .object({
    ...createBasicUserSchema().shape,
    currentPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 如果设置了新密码，则需要验证原密码和确认密码
    if (data.password || data.passwordConfirm || data.currentPassword) {
      // 如果有任何与密码相关的字段被填写，则所有字段都必须填写
      if (!data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '修改密码时必须输入原密码',
          path: ['currentPassword'],
        })
      }
      if (!data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '请输入新密码',
          path: ['password'],
        })
      }
      if (!data.passwordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '请确认新密码',
          path: ['passwordConfirm'],
        })
      }
      // 如果新密码已填写，检查是否匹配
      if (
        data.password &&
        data.passwordConfirm &&
        data.password !== data.passwordConfirm
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '两次输入的密码不一致',
          path: ['passwordConfirm'],
        })
      }
    }
  })

// 创建用户时的 Schema (不包含 id)
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
    throw new Error('用户不存在')
  }

  const current = currentUser[0]

  // 处理表单数据
  const rawFormData = {
    name: formData.get('name')?.toString() || current.name,
    email: formData.get('email')?.toString() || current.email,
    currentPassword: formData.get('currentPassword')?.toString(),
    password: formData.get('password')?.toString(),
    passwordConfirm: formData.get('passwordConfirm')?.toString(),
    address: formData.get('address')?.toString() ?? current.address,
  }

  const validatedData = UpdateUser.parse(rawFormData)

  const { name, email, currentPassword, password, address } = validatedData

  try {
    if (password) {
      // 获取用户当前的密码哈希
      const user = await sql<{ password: string }[]>`
        SELECT password FROM users WHERE id = ${id}
      `

      if (!user.length) {
        throw new Error('用户不存在')
      }

      // 验证原密码
      const isValid = await bcrypt.compare(currentPassword!, user[0].password)
      if (!isValid) {
        throw new Error('原密码不正确')
      }

      // 对新密码进行哈希处理
      const hashedPassword = await bcrypt.hash(password, 10)

      // 更新包括密码在内的所有字段
      await sql`
        UPDATE users
        SET name = ${name},
            email = ${email},
            address = ${address},
            password = ${hashedPassword}
        WHERE id = ${id}
      `
    } else {
      // 如果不修改密码，只更新其他字段
      const updateFields = []
      const values = []

      if (name !== undefined) {
        updateFields.push('name = $1')
        values.push(name)
      }
      if (email !== undefined) {
        updateFields.push(`email = $${values.length + 1}`)
        values.push(email)
      }
      if (address !== undefined) {
        updateFields.push(`address = $${values.length + 1}`)
        values.push(address)
      }

      if (updateFields.length > 0) {
        values.push(id)
        await sql.unsafe(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${
            values.length
          }`,
          values
        )
      }
    }
  } catch (error: any) {
    if (error.message === '原密码不正确') {
      throw new Error('原密码不正确')
    }
    console.error('Database Error: Failed to update user, error: ', error)
    throw new Error('更新用户信息失败')
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
