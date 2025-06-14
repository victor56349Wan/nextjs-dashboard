import Link from 'next/link'
import { FaceFrownIcon } from '@heroicons/react/24/outline'
import { headers } from 'next/headers'

export default async function NotFound() {
  const headersList = await headers()
  const domain = headersList.get('host')
  // const data = await getSiteData(domain)
  return (
    <main className="flex h-full flex-col items-center justify-center gap-2">
      <FaceFrownIcon className="w-10 text-gray-400" />
      <h2>Not Found: {domain}</h2>
      <h2 className="text-xl font-semibold">404 Not Found</h2>
      <p className="text-gray-400">Could not find the requested page.</p>
      <Link
        href="/"
        className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-400">
        Back to Home
      </Link>
    </main>
  )
}
