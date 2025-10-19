"use client"

import * as React from "react"
import { SSRSafe } from "@/components/ssr-safe"
import {
  Home,
  Users,
    Calendar as CalendarIcon,
  BadgeMinus,
  BadgePlus,
  Receipt,
  Clock,
  Archive,
  Banknote,
  Settings,
  FileText,
  Calendar,
  Database,
  UserCheck,
  Minus,
  Plus,
  BarChart3,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"

// PMS Admin Dashboard Data - this will be made dynamic
const getNavData = (user?: { id?: string, name?: string | null, email?: string, avatar?: string | null }) => ({
  user: {
    id: user?.id,
    name: user?.name || "System Administrator",
    email: user?.email || "admin@pms.com",
    avatar: user?.avatar || "",
  },
  navMain: [],
  projects: [],
})

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { id?: string, name?: string | null, email?: string, avatar?: string | null }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const data = getNavData(user)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                <img 
                  src="/ckcm.png" 
                  alt="CKCM Logo" 
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">CKCM PMS</span>
                <span className="text-xs text-muted-foreground">Welcome to PMS</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="group-data-[collapsible=icon]:hidden px-3 py-2 mt-2">
          <p className="text-xs font-medium text-muted-foreground">Account</p>
        </div>
        <SSRSafe>
          <NavUser user={data.user} role="admin" />
        </SSRSafe>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarSeparator />
        
        {/* Main Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Core Operations */}
        <SidebarGroup>
          <SidebarGroupLabel>Core Operations</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/attendance">
                    <Clock />
                    <span>Attendance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/leaves">
                    <CalendarIcon />
                    <span>Leaves</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/payroll">
                    <Receipt />
                    <span>Payroll</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/loans">
                    <Banknote />
                    <span>Loans</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* User Management */}
        <SidebarGroup>
          <SidebarGroupLabel>User Management</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/user-management">
                    <Users />
                    <span>Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/personnel-types">
                    <UserCheck />
                    <span>Position</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Financial Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Financial Management</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/deductions">
                    <Minus />
                    <span>Deductions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* System Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>System Settings</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/attendance-settings">
                    <Settings />
                    <span>Attendance Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/header-settings">
                    <FileText />
                    <span>Header Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/holidays">
                    <Calendar />
                    <span>Holidays</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Reports & Data */}
        <SidebarGroup>
          <SidebarGroupLabel>Reports & Data</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/reports">
                    <BarChart3 />
                    <span>Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/archive">
                    <Archive />
                    <span>Archive</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden px-3 py-2 text-center border-t">
          <p className="text-xs font-medium">CKCM Payroll Management System</p>
          <p className="text-xs text-muted-foreground">© 2025 All rights reserved</p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
