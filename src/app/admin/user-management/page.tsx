import { Suspense } from 'react'
import { UserManagement } from '@/components/user-management'

export default function UserManagementPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <UserManagement />
      </Suspense>
    </div>
  )
}

