import { createUser } from '@/app/lib/actions'
import { Button } from '@/app/ui/button'

export default function CreateUserForm() {
  return (
    <form action={createUser}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* 用户姓名 */}
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Name
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter user name"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
                required
              />
            </div>
          </div>
        </div>

        {/* 电子邮箱 */}
        <div className="mb-4">
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email address"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
                required
              />
            </div>
          </div>
        </div>

        {/* 密码 */}
        <div className="mb-4">
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Password
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
                required
                minLength={8}
              />
              <div className="mt-1 text-xs text-gray-500">
                Password must contain: uppercase, lowercase, number, and special
                character. Minimum 8 characters.
              </div>
            </div>
          </div>
        </div>

        {/* 确认密码 */}
        <div className="mb-4">
          <label
            htmlFor="passwordConfirm"
            className="mb-2 block text-sm font-medium">
            Confirm Password
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                placeholder="Confirm password"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
                required
                minLength={8}
              />
            </div>
          </div>
        </div>

        {/* 地址 */}
        <div className="mb-4">
          <label htmlFor="address" className="mb-2 block text-sm font-medium">
            Address
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="address"
                name="address"
                type="text"
                placeholder="Enter address (optional)"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <Button href="/dashboard/users">Cancel</Button>
        <Button type="submit">Create User</Button>
      </div>
    </form>
  )
}
