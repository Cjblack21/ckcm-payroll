import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"


export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching archived payroll entries...')

    // First, let's check what payroll entries exist and their statuses
    const allPayrollEntries = await prisma.payrollEntry.findMany({
      select: {
        payroll_entries_id: true,
        status: true,
        releasedAt: true,
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: { processedAt: 'desc' },
      take: 10 // Just get the latest 10 to see what's there
    })
    
    console.log('All payroll entries (latest 10):')
    allPayrollEntries.forEach((entry, index) => {
      console.log(`Entry ${index + 1}: User: ${entry.user?.name}, Status: ${entry.status}, Released: ${entry.releasedAt}`)
    })

    // Fetch all archived payroll entries with detailed information
    const entries = await prisma.payrollEntry.findMany({
      where: {
        status: 'ARCHIVED'
      },
      include: {
        user: { 
          select: { 
            users_id: true, 
            name: true, 
            email: true,
            personnelType: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          } 
        }
      },
      orderBy: { releasedAt: 'desc' }
    })
    
    console.log('Database query executed for ARCHIVED status')

    console.log(`Found ${entries.length} archived payroll entries`)
    
    // Log details of found entries
    entries.forEach((entry, index) => {
      console.log(`Entry ${index + 1}: User: ${entry.user?.name}, Period: ${entry.periodStart.toISOString().split('T')[0]} to ${entry.periodEnd.toISOString().split('T')[0]}, Status: ${entry.status}`)
    })

    // If no entries found, return empty result
    if (entries.length === 0) {
      console.log('No archived payroll entries found')
      return NextResponse.json({ 
        groupedItems: [],
        totalDates: 0,
        totalPayrolls: 0
      })
    }

    console.log('Fetching related data...')

    // Get attendance records for the archived payrolls to reconstruct details
    const payrollPeriods = entries.map(entry => ({
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd
    }))

    // Get unique periods
    const uniquePeriods = Array.from(
      new Set(payrollPeriods.map(p => `${p.periodStart.toISOString()}-${p.periodEnd.toISOString()}`))
    )

    console.log(`Fetching attendance records for ${uniquePeriods.length} unique periods`)

    // Fetch attendance records for all periods
    let attendanceRecords = []
    try {
      attendanceRecords = await prisma.attendance.findMany({
        where: {
          OR: uniquePeriods.map(period => {
            const [start, end] = period.split('-')
            return {
              date: {
                gte: new Date(start),
                lte: new Date(end)
              }
            }
          })
        },
        include: {
          user: {
            select: {
              users_id: true,
              name: true,
              email: true
            }
          }
        }
      })
    } catch (error) {
      console.warn('Error fetching attendance records:', error)
      attendanceRecords = []
    }

    console.log(`Found ${attendanceRecords.length} attendance records`)

    // Get loan records for the archived payrolls
    let loanRecords = []
    try {
      loanRecords = await prisma.loan.findMany({
        where: {
          users_id: {
            in: entries.map(entry => entry.users_id)
          },
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: {
              users_id: true,
              name: true,
              email: true
            }
          }
        }
      })
    } catch (error) {
      console.warn('Error fetching loan records:', error)
      loanRecords = []
    }

    console.log(`Found ${loanRecords.length} loan records`)

    // Note: We now fetch actual deduction records per user instead of deduction types

    // Get attendance settings for accurate deduction calculations
    let attendanceSettings = null
    try {
      attendanceSettings = await prisma.attendanceSettings.findFirst({
        where: { isActive: true }
      })
    } catch (error) {
      console.warn('Error fetching attendance settings:', error)
    }

    console.log('Processing payroll entries...')

    // Pre-fetch ALL data to avoid async issues in reduce function
    let allDeductionRecords = []
    let allAttendanceRecords = []
    
    try {
      if (entries.length > 0) {
        // Pre-fetch deduction records
        allDeductionRecords = await prisma.deduction.findMany({
          where: {
            users_id: {
              in: entries.map(entry => entry.users_id)
            },
            appliedAt: {
              gte: new Date(Math.min(...entries.map(e => e.periodStart.getTime()))),
              lte: new Date(Math.max(...entries.map(e => e.periodEnd.getTime())))
            }
          },
          include: {
            deductionType: {
              select: {
                name: true,
                description: true
              }
            }
          }
        })
        
        // Pre-fetch ALL attendance records for all users and periods
        allAttendanceRecords = await prisma.attendance.findMany({
          where: {
            users_id: {
              in: entries.map(entry => entry.users_id)
            },
            date: {
              gte: new Date(Math.min(...entries.map(e => e.periodStart.getTime()))),
              lte: new Date(Math.max(...entries.map(e => e.periodEnd.getTime())))
            }
          },
          orderBy: {
            date: 'asc'
          }
        })
      }
    } catch (error) {
      console.warn('Error fetching records:', error)
      allDeductionRecords = []
      allAttendanceRecords = []
    }
    
    console.log(`Found ${allDeductionRecords.length} total deduction records`)
    console.log(`Found ${allAttendanceRecords.length} total attendance records`)

    // Group by release date
    const groupedByDate = entries.reduce((acc, entry) => {
      try {
        console.log(`🔍 PROCESSING ENTRY - User: ${entry.user?.name}, Period: ${entry.periodStart.toISOString().split('T')[0]} to ${entry.periodEnd.toISOString().split('T')[0]}`)
        let releaseDate = 'Unknown'
        
        if (entry.releasedAt) {
          try {
            const date = new Date(entry.releasedAt)
            if (!isNaN(date.getTime())) {
              releaseDate = date.toISOString().split('T')[0]
            }
          } catch (error) {
            console.warn('Invalid releasedAt date:', entry.releasedAt)
          }
        }
        
        if (!acc[releaseDate]) {
          acc[releaseDate] = {
            date: releaseDate,
            totalEmployees: 0,
            totalNetPay: 0,
            payrolls: []
          }
        }
        
        acc[releaseDate].totalEmployees += 1
        acc[releaseDate].totalNetPay += Number(entry.netPay)
        
        // Note: We now use direct attendance queries instead of pre-fetched data

        // Filter attendance records for this user and period from pre-fetched data
        const directAttendanceRecords = allAttendanceRecords.filter(record => 
          record.users_id === entry.users_id &&
          record.date >= entry.periodStart &&
          record.date <= entry.periodEnd
        )

        // Get loan records for this user
        const userLoanRecords = loanRecords.filter(loan => 
          loan.users_id === entry.users_id
        )

        // Calculate attendance details from direct query results
        const attendanceDetails = directAttendanceRecords.map(record => {
          let workHours = 0
          if (record.timeIn && record.timeOut) {
            const timeIn = new Date(record.timeIn)
            const timeOut = new Date(record.timeOut)
            workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60) // Convert to hours
          }
          
          return {
            date: record.date.toISOString().split('T')[0],
            timeIn: record.timeIn?.toISOString() || null,
            timeOut: record.timeOut?.toISOString() || null,
            status: record.status,
            workHours: workHours
          }
        })

        // Calculate loan details
        const periodDays = Math.floor((entry.periodEnd.getTime() - entry.periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const loanFactor = periodDays <= 16 ? 0.5 : 1.0
        const loanDetails = userLoanRecords.map(loan => {
          const monthlyPayment = Number(loan.amount) * Number(loan.monthlyPaymentPercent) / 100
          const periodPayment = monthlyPayment * loanFactor
          return {
            type: 'Loan Payment',
            amount: periodPayment,
            description: `Loan Payment - Amount: ₱${Number(loan.amount).toLocaleString()}, Monthly %: ${Number(loan.monthlyPaymentPercent)}%`
          }
        })
        
        console.log(`🔍 DIRECT QUERY - User: ${entry.user?.name} (${entry.users_id})`)
        console.log(`🔍 DIRECT QUERY - Period: ${entry.periodStart.toISOString().split('T')[0]} to ${entry.periodEnd.toISOString().split('T')[0]}`)
        console.log(`🔍 DIRECT QUERY - Found ${directAttendanceRecords.length} attendance records`)
        
        // Log each attendance record
        directAttendanceRecords.forEach(record => {
          console.log(`🔍 DIRECT QUERY - Record: ${record.date.toISOString().split('T')[0]}, Status: ${record.status}, TimeIn: ${record.timeIn}, TimeOut: ${record.timeOut}`)
        })
        
        // Calculate attendance deductions from direct query results
        const basicSalary = entry.user?.personnelType?.basicSalary ? Number(entry.user.personnelType.basicSalary) : Number(entry.basicSalary)
        const workingDaysInPeriod = Math.floor((entry.periodEnd.getTime() - entry.periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const timeInEnd = attendanceSettings?.timeInEnd || '09:30'
        
        console.log(`🔍 DIRECT QUERY - Basic Salary: ₱${basicSalary}, Working Days: ${workingDaysInPeriod}, TimeInEnd: ${timeInEnd}`)
        
        let attendanceDeductionDetails = []
        let totalAttendanceDeductions = 0
        
        // Process each attendance record
        directAttendanceRecords.forEach(record => {
          console.log(`🔍 PROCESSING - Date: ${record.date.toISOString().split('T')[0]}, Status: ${record.status}`)
          
          if (record.status === 'LATE' && record.timeIn) {
            // Calculate late deduction
            const timeIn = new Date(record.timeIn)
            const expected = new Date(record.date)
            const [h, m] = timeInEnd.split(':').map(Number)
            const adjM = m + 1 // Deductions start 1 minute after timeInEnd
            if (adjM >= 60) {
              expected.setHours(h + 1, adjM - 60, 0, 0)
            } else {
              expected.setHours(h, adjM, 0, 0)
            }
            
            const perSecond = (basicSalary / workingDaysInPeriod / 8 / 60 / 60)
            const secondsLate = Math.max(0, (timeIn.getTime() - expected.getTime()) / 1000)
            const daily = basicSalary / workingDaysInPeriod
            const amount = Math.min(secondsLate * perSecond, daily * 0.5)
            
            if (amount > 0) {
              attendanceDeductionDetails.push({
                date: record.date.toISOString().split('T')[0],
                amount: amount,
                description: `Late arrival - ${Math.round(secondsLate / 60)} minutes late`
              })
              totalAttendanceDeductions += amount
              console.log(`🔍 LATE DEDUCTION - ₱${amount.toFixed(2)} for ${Math.round(secondsLate / 60)} minutes late`)
            }
          } else if (record.status === 'ABSENT') {
            const amount = basicSalary / workingDaysInPeriod
            attendanceDeductionDetails.push({
              date: record.date.toISOString().split('T')[0],
              amount: amount,
              description: 'Absence deduction'
            })
            totalAttendanceDeductions += amount
            console.log(`🔍 ABSENCE DEDUCTION - ₱${amount.toFixed(2)}`)
          } else if (record.status === 'PARTIAL') {
            // Calculate partial deduction
            let hoursShort = 8
            if (record.timeIn && record.timeOut) {
              const timeIn = new Date(record.timeIn)
              const timeOut = new Date(record.timeOut)
              const hoursWorked = Math.max(0, (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60))
              hoursShort = Math.max(0, 8 - hoursWorked)
            }
            const hourlyRate = (basicSalary / workingDaysInPeriod) / 8
            const amount = hoursShort * hourlyRate
            
            if (amount > 0) {
              attendanceDeductionDetails.push({
                date: record.date.toISOString().split('T')[0],
                amount: amount,
                description: `Partial attendance - ${hoursShort.toFixed(1)} hours short`
              })
              totalAttendanceDeductions += amount
              console.log(`🔍 PARTIAL DEDUCTION - ₱${amount.toFixed(2)} for ${hoursShort.toFixed(1)} hours short`)
            }
          }
        })
        
        console.log(`🔍 FINAL RESULT - Total Attendance Deductions: ₱${totalAttendanceDeductions.toFixed(2)}`)
        console.log(`🔍 FINAL RESULT - Deduction Details:`, attendanceDeductionDetails)
        console.log(`🔍 SUMMARY - User: ${entry.user?.name}, Period: ${entry.periodStart.toISOString().split('T')[0]} to ${entry.periodEnd.toISOString().split('T')[0]}, Records: ${directAttendanceRecords.length}, Deductions: ${attendanceDeductionDetails.length}, Total: ₱${totalAttendanceDeductions.toFixed(2)}`)
        
        // Get other deduction records (non-attendance related)
        const otherDeductionRecords = allDeductionRecords.filter(deduction => 
          deduction.users_id === entry.users_id &&
          deduction.appliedAt >= entry.periodStart &&
          deduction.appliedAt <= entry.periodEnd &&
          !['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Early Time-Out', 'Partial Attendance'].includes(deduction.deductionType.name)
        )
        
        const otherDeductionDetails = otherDeductionRecords.map(deduction => ({
          type: deduction.deductionType.name,
          amount: Number(deduction.amount),
          description: `${deduction.deductionType.name} - ${deduction.deductionType.description || 'Other deduction'}`
        }))
        
        console.log(`🔍 ARCHIVE DEBUG - Total Attendance Deductions (Real-time): ₱${totalAttendanceDeductions}`)
        console.log(`🔍 ARCHIVE DEBUG - Attendance Deduction Details:`, attendanceDeductionDetails)

        acc[releaseDate].payrolls.push({
          payroll_entries_id: entry.payroll_entries_id,
          users_id: entry.users_id,
          userName: entry.user?.name ?? null,
          userEmail: entry.user?.email || '',
          periodStart: entry.periodStart.toISOString(),
          periodEnd: entry.periodEnd.toISOString(),
          basicSalary: Number(entry.basicSalary),
          overtime: Number(entry.overtime),
          deductions: Number(entry.deductions),
          netPay: Number(entry.netPay),
          releasedAt: entry.releasedAt?.toISOString() || null,
          processedAt: entry.processedAt.toISOString(),
          // Add detailed breakdown
          breakdown: {
            basicSalary: Number(entry.basicSalary),
            overtime: Number(entry.overtime),
            grossPay: Number(entry.basicSalary) + Number(entry.overtime),
            totalDeductions: Number(entry.deductions),
            netPay: Number(entry.netPay),
            attendanceDetails: attendanceDetails,
            attendanceDeductionDetails: attendanceDeductionDetails,
            totalAttendanceDeductions: totalAttendanceDeductions,
            loanDetails: loanDetails,
            otherDeductionDetails: otherDeductionDetails,
            personnelType: entry.user?.personnelType?.name || 'Unknown',
            personnelBasicSalary: Number(entry.user?.personnelType?.basicSalary || 0)
          }
        })
      } catch (error) {
        console.error('Error processing payroll entry:', entry.payroll_entries_id, error)
      }
      
      return acc
    }, {} as Record<string, any>)

    console.log('Converting to array and sorting...')

    // Convert to array and sort by date
    const groupedItems = Object.values(groupedByDate).sort((a: any, b: any) => {
      // Handle 'Unknown' dates by putting them at the end
      if (a.date === 'Unknown') return 1
      if (b.date === 'Unknown') return -1
      
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      
      // Handle invalid dates
      if (isNaN(dateA.getTime())) return 1
      if (isNaN(dateB.getTime())) return -1
      
      return dateB.getTime() - dateA.getTime()
    })

    console.log(`Successfully processed ${groupedItems.length} date groups with ${entries.length} total payroll entries`)
    
    // Log final response structure
    console.log('Final response structure:')
    console.log(`- Total date groups: ${groupedItems.length}`)
    console.log(`- Total payroll entries: ${entries.length}`)
    groupedItems.forEach((group, index) => {
      console.log(`- Group ${index + 1}: Date: ${group.date}, Employees: ${group.totalEmployees}, Payrolls: ${group.payrolls.length}`)
    })

    return NextResponse.json({ 
      groupedItems,
      totalDates: groupedItems.length,
      totalPayrolls: entries.length
    })
  } catch (error) {
    console.error('Error fetching archive:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Failed to fetch archive',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}












