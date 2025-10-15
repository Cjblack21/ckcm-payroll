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
} from "@/components/ui/sidebar"
import Link from "next/link"

// PMS Admin Dashboard Data - this will be made dynamic
const getNavData = (user?: { name?: string | null, email?: string }) => ({
  user: {
    name: user?.name || "System Administrator",
    email: user?.email || "admin@pms.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [],
  projects: [],
})

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name?: string | null, email?: string }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const data = getNavData(user)
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <img 
            src="/ckcm.png" 
            alt="CKCM Logo" 
            className="h-8 w-8 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">CKCM PMS</span>
            <span className="text-xs text-muted-foreground">Administrator</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        {/* Main Dashboard */}
        <SidebarGroup>
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
                    <span>Personnel Types</span>
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/data-retention">
                    <Database />
                    <span>Data Retention</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SSRSafe>
          <NavUser user={data.user} />
        </SSRSafe>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
