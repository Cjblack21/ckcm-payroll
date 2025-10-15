"use client"

import { useState } from "react"
import { SSRSafe } from "@/components/ssr-safe"
import { useTheme } from "next-themes"
import { Sun, Moon, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { FunctionalNotifications } from "@/components/functional-notifications"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"

interface HeaderProps {
  breadcrumbs?: Array<{
    href?: string
    label: string
    isCurrentPage?: boolean
  }>
}

export function Header({ breadcrumbs = [] }: HeaderProps) {
  const { setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 bg-background/95 dark:bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 dark:supports-[backdrop-filter]:bg-sidebar/90 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      {/* Breadcrumbs */}
      <div className="flex-1">
        {breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  <BreadcrumbItem>
                    {crumb.isCurrentPage ? (
                      <BreadcrumbPage className="text-card-foreground font-medium">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink 
                        href={crumb.href || "#"}
                        className="text-card-foreground/70 hover:text-card-foreground"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && (
                    <BreadcrumbSeparator className="text-card-foreground/50" />
                  )}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Functional Notifications */}
        <SSRSafe>
          <FunctionalNotifications />
        </SSRSafe>

        {/* Theme toggle */}
        <SSRSafe>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-foreground dark:text-sidebar-foreground hover:bg-foreground/10 dark:hover:bg-sidebar-foreground/10">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Settings className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </SSRSafe>
      </div>
    </header>
  )
}
