"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Flag } from "lucide-react"
import { toast } from "react-hot-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"

interface Holiday {
  holidays_id: string
  name: string
  date: string
  type: 'NATIONAL' | 'RELIGIOUS' | 'COMPANY'
  description?: string
  createdAt: string
}

export default function PersonnelHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showHolidayDetails, setShowHolidayDetails] = useState(false)

  useEffect(() => {
    fetchHolidays()
  }, [])

  const fetchHolidays = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/personnel/holidays')
      const data = await response.json()
      
      if (response.ok) {
        setHolidays(data.holidays || [])
      } else {
        toast.error('Failed to fetch holidays')
      }
    } catch (error) {
      console.error('Error fetching holidays:', error)
      toast.error('Failed to fetch holidays')
    } finally {
      setIsLoading(false)
    }
  }

  const getHolidaysForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const customHolidays = holidays.filter(h => {
      const holidayDate = h.date.split('T')[0]
      return holidayDate === dateStr
    })
    
    return customHolidays
  }

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfMonth(monthStart)
    const endDate = endOfMonth(monthEnd)
    
    return eachDayOfInterval({ start: startDate, end: endDate })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'NATIONAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'RELIGIOUS':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'COMPANY':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const handleDateClick = (date: Date) => {
    const dateHolidays = getHolidaysForDate(date)
    if (dateHolidays.length > 0) {
      setSelectedDate(date)
      setShowHolidayDetails(true)
    }
  }

  const getSelectedDateHolidays = () => {
    if (!selectedDate) return []
    return getHolidaysForDate(selectedDate)
  }

  // Get upcoming holidays (next 30 days)
  const getUpcomingHolidays = () => {
    const today = new Date()
    const next30Days = new Date()
    next30Days.setDate(today.getDate() + 30)
    
    return holidays
      .filter(h => {
        const holidayDate = new Date(h.date)
        return holidayDate >= today && holidayDate <= next30Days
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Holidays Calendar</h1>
          <p className="text-muted-foreground">
            View scheduled holidays and non-working days
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Holidays Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Holidays - {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading holidays...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Holiday Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays
                      .filter(holiday => {
                        const holidayDate = new Date(holiday.date)
                        return isSameMonth(holidayDate, currentMonth)
                      })
                      .length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No holidays found for {format(currentMonth, 'MMMM yyyy')}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      holidays
                        .filter(holiday => {
                          const holidayDate = new Date(holiday.date)
                          return isSameMonth(holidayDate, currentMonth)
                        })
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((holiday) => (
                          <TableRow key={holiday.holidays_id}>
                            <TableCell className="font-medium">{holiday.name}</TableCell>
                            <TableCell>
                              {format(new Date(holiday.date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge className={getTypeColor(holiday.type)}>
                                {holiday.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {holiday.description || 'No description'}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calendar Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Calendar View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar View
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Calendar Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  ←
                </Button>
                <h3 className="font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  →
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                {getCalendarDays().map((day, index) => {
                  const dayHolidays = getHolidaysForDate(day)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isToday = isSameDay(day, new Date())
                  const hasHolidays = dayHolidays.length > 0
                  const isSunday = day.getDay() === 0
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`
                        p-2 text-center text-xs border rounded cursor-pointer transition-colors
                        ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                        ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                        ${hasHolidays ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 dark:bg-yellow-950 dark:border-yellow-800' : 'hover:bg-muted'}
                        ${isSunday && !hasHolidays ? 'bg-gray-100 dark:bg-gray-800' : ''}
                        ${!isCurrentMonth ? 'opacity-50' : ''}
                      `}
                    >
                      <div className="font-medium">{format(day, 'd')}</div>
                      {hasHolidays && (
                        <>
                          <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1" />
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {dayHolidays.length} {dayHolidays.length > 1 ? 'holidays' : 'holiday'}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Holiday</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 border rounded"></div>
                  <span>Sunday</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-primary rounded border"></div>
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Holidays */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Holidays</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {getUpcomingHolidays().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming holidays in the next 30 days
                </p>
              ) : (
                <div className="space-y-3">
                  {getUpcomingHolidays().map((holiday) => (
                    <div key={holiday.holidays_id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        {holiday.type === 'NATIONAL' ? (
                          <Flag className="h-4 w-4 text-red-500" />
                        ) : holiday.type === 'RELIGIOUS' ? (
                          <MapPin className="h-4 w-4 text-purple-500" />
                        ) : (
                          <Calendar className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{holiday.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(holiday.date), 'MMM dd, yyyy (EEEE)')}
                        </p>
                        <Badge className={`${getTypeColor(holiday.type)} mt-1 text-xs`}>
                          {holiday.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Holiday Details Dialog */}
      <Dialog open={showHolidayDetails} onOpenChange={setShowHolidayDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Holidays on {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {getSelectedDateHolidays().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No holidays on this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getSelectedDateHolidays().map((holiday, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-lg">{holiday.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(holiday.date), 'MMMM dd, yyyy (EEEE)')}
                        </p>
                        {holiday.description && (
                          <p className="text-sm mt-2">{holiday.description}</p>
                        )}
                      </div>
                      <Badge className={getTypeColor(holiday.type)}>
                        {holiday.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

