'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log the error information when an error occurs
  /*   useEffect(() => {
    console.error('Global Error:', error)
  }, [error]) */

  console.log('global error: ', error)
  return (
    // global-error must include html and body tags
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Sorry, something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              {error.message ||
                'An unexpected error occurred in the application. We are working to fix this issue.'}
            </p>
            {error.digest && (
              <p className="text-sm text-gray-500 mb-4">
                Error Code: {error.digest}
              </p>
            )}
            <button
              onClick={() => reset()}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors">
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
