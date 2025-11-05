import { Suspense } from 'react'
import { UserManagement } from '@/components/user-management'
import { Users } from 'lucide-react'

export default function UserManagementPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Personnel Management
          </h2>
          <p className="text-muted-foreground">Manage personnel accounts, roles, and information</p>
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <UserManagement />
      </Suspense>
    </div>
  )
}

