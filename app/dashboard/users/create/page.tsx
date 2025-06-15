import Form from '@/app/ui/users/create-form'
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '创建用户',
}

export default async function Page() {
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: '用户管理', href: '/dashboard/users' },
          {
            label: '创建用户',
            href: '/dashboard/users/create',
            active: true,
          },
        ]}
      />
      <Form />
    </main>
  )
}
