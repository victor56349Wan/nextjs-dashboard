import { CustomerForm } from '@/app/lib/definitions'
import { Button } from '@/app/ui/button'
import { createCustomer } from '@/app/lib/actions'
import Link from 'next/link'

export default function Form({ customer }: { customer?: CustomerForm }) {
  const initialState = { message: null, errors: {} }

  return (
    <form action={createCustomer}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* Customer Name */}
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={customer?.name}
            placeholder="Enter customer name"
            className="peer block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2 placeholder:text-gray-500"
            aria-describedby="name-error"
            required
          />
        </div>

        {/* Customer Email */}
        <div className="mb-4">
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={customer?.email}
            placeholder="Enter customer email"
            className="peer block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2 placeholder:text-gray-500"
            aria-describedby="email-error"
            required
          />
        </div>

        {/* Customer Image URL */}
        <div className="mb-4">
          <label htmlFor="image_url" className="mb-2 block text-sm font-medium">
            Image URL
          </label>
          <input
            id="image_url"
            name="image_url"
            type="text"
            defaultValue={customer?.image_url}
            placeholder="Enter customer image URL or relative path (e.g., /customers/avatar.png)"
            className="peer block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2 placeholder:text-gray-500"
            aria-describedby="image-error"
            pattern="^(\/|https?:\/\/).*"
            title="Please enter a URL starting with '/' or 'http://' or 'https://'"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/invoices"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200">
          Cancel
        </Link>
        <Button type="submit">
          {customer ? 'Edit Customer' : 'Create Customer'}
        </Button>
      </div>
    </form>
  )
}
