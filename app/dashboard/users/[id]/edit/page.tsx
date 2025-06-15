import Form from '@/app/ui/users/edit-form'
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs'
import { fetchUserById } from '@/app/lib/data'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit User',
}

export default async function Page(props: {
  params: Promise<{
    id: string
  }>
}) {
  const params = await props.params
  const id = params.id
  const user = await fetchUserById(id)

  if (!user) {
    notFound()
  }

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Users', href: '/dashboard/users' },
          {
            label: 'Edit User',
            href: `/dashboard/users/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form user={user} />
    </main>
  )
}
