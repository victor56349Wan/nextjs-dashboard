import { Metadata } from 'next'
import Search from '@/app/ui/search'
import Table from '@/app/ui/customers/table'
import { Suspense } from 'react'
import { fetchFilteredCustomers } from '@/app/lib/data'
import { CustomersTableSkeleton } from '@/app/ui/skeletons'
import { lusitana } from '@/app/ui/fonts'

export const metadata: Metadata = {
  title: 'Customers',
}

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string
  }
}) {
  const query = searchParams?.query || ''

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Customers</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Search customers..." />
      </div>
      <Suspense key={query} fallback={<CustomersTableSkeleton />}>
        <Table customers={await fetchFilteredCustomers(query)} />
      </Suspense>
    </div>
  )
}
