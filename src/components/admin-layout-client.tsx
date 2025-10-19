"use client"

import { AttendanceChecker } from "./attendance-checker"

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AttendanceChecker />
      {children}
    </>
  )
}
