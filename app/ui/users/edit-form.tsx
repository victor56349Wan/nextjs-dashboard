import { UserForm } from '@/app/lib/definitions'
import { Button } from '@/app/ui/button'
import { updateUser } from '@/app/lib/actions'

export default function EditUserForm({ user }: { user: UserForm }) {
  const updateUserWithId = updateUser.bind(null, user.id)

  return (
    <form action={updateUserWithId}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* 用户姓名 */}
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            用户姓名
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={user.name}
                placeholder="请输入用户姓名"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
                required
              />
            </div>
          </div>
        </div>

        {/* 电子邮箱 */}
        <div className="mb-4">
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            电子邮箱
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                placeholder="请输入电子邮箱"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
                required
              />
            </div>
          </div>
        </div>

        {/* 当前密码 */}
        <div className="mb-4">
          <label
            htmlFor="currentPassword"
            className="mb-2 block text-sm font-medium">
            当前密码
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="如需修改密码，请输入当前密码"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* 新密码 */}
        <div className="mb-4">
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            新密码
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                placeholder="若不修改密码请留空"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
                minLength={8}
              />
              <div className="mt-1 text-xs text-gray-500">
                密码必须包含：大写字母、小写字母、数字和特殊字符，长度至少8位
              </div>
            </div>
          </div>
        </div>

        {/* 确认新密码 */}
        <div className="mb-4">
          <label
            htmlFor="passwordConfirm"
            className="mb-2 block text-sm font-medium">
            确认新密码
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                placeholder="请再次输入新密码"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
                minLength={8}
              />
            </div>
          </div>
        </div>

        {/* 地址 */}
        <div className="mb-4">
          <label htmlFor="address" className="mb-2 block text-sm font-medium">
            地址
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="address"
                name="address"
                type="text"
                defaultValue={user.address}
                placeholder="请输入地址（可选）"
                className="peer block w-full rounded-md border border-gray-200 py-2 text-sm outline-2 placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <Button href="/dashboard/users">取消</Button>
        <Button type="submit">保存修改</Button>
      </div>
    </form>
  )
}
