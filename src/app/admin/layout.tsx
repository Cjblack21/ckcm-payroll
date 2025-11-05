import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { AdminLayoutClient } from "@/components/admin-layout-client"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/")
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <DynamicBreadcrumb />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-auto">
          <AdminLayoutClient>
            {children}
          </AdminLayoutClient>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
