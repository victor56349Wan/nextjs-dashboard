import { Metadata } from 'next'
import Search from '@/app/ui/search'
import Table from '@/app/ui/users/table'
import { Suspense } from 'react'
import { fetchUsersPages } from '@/app/lib/data'
import { UsersTableSkeleton } from '@/app/ui/skeletons'
import { lusitana } from '@/app/ui/fonts'
import { CreateUser } from '@/app/ui/users/buttons'
import Pagination from '@/app/ui/invoices/pagination'

export const metadata: Metadata = {
  title: '用户管理',
}

export default async function Page(props: {
  searchParams?: {
    query?: string
    page?: string
  }
}) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ''
  const currentPage = Number(searchParams?.page) || 1
  const totalPages = await fetchUsersPages(query)

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>用户管理</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="搜索用户..." />
        <CreateUser />
      </div>
      <Suspense key={query + currentPage} fallback={<UsersTableSkeleton />}>
        <Table query={query} currentPage={currentPage} />
      </Suspense>
      <div className="mt-5 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  )
}
