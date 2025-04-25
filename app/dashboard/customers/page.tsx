import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Customers',
}
export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <p>Manage your customers here.</p>
    </div>
  )
}
