import Form from '@/app/ui/invoices/create-form'
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs'
import { fetchCustomers } from '@/app/lib/data'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Invoices',
}
export default async function Page() {
  const customers = await fetchCustomers()

  // Ensure customers is always an array
  const safeCustomers = customers || []

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          {
            label: 'Create Invoice',
            href: '/dashboard/invoices/create',
            active: true,
          },
        ]}
      />
      <Form customers={safeCustomers} />
    </main>
  )
}
