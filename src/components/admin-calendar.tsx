"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface CalendarEvent {
  date: Date
  name: string
  type: string
  description?: string | null
}

interface CalendarData {
  holidays: Array<{ date: Date; name: string; type: string; description?: string | null }>
  events: Array<{ date: Date; name: string; type: string; description?: string | null }>
}

export function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [calendarData, setCalendarData] = useState<CalendarData>({
    holidays: [],
    events: []
  })
  const [, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCalendarData() {
      try {
        const response = await fetch('/api/dashboard/calendar')
        const data = await response.json()
        setCalendarData({
          holidays: data.holidays.map((h: { date: string; name: string; type: string; description?: string | null }) => ({ ...h, date: new Date(h.date) })),
          events: data.events.map((e: { date: string; name: string; type: string; description?: string | null }) => ({ ...e, date: new Date(e.date) }))
        })
      } catch (error) {
        console.error('Error fetching calendar data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCalendarData()
  }, [])

  // Combine holidays and events
  const calendarEvents: CalendarEvent[] = [
    ...calendarData.holidays,
    ...calendarData.events
  ]

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? calendarEvents.filter(event =>
      format(event.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    )
    : []

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'national': return 'bg-red-100 text-red-800'
      case 'religious': return 'bg-purple-100 text-purple-800'
      case 'payroll': return 'bg-green-100 text-green-800'
      case 'hr': return 'bg-blue-100 text-blue-800'
      case 'event': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>View holidays and important dates</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="scale-125 origin-center my-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                holiday: calendarData.holidays.map(h => h.date),
                event: calendarData.events.map(e => e.date)
              }}
              modifiersStyles={{
                holiday: {
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  fontWeight: 'bold'
                },
                event: {
                  backgroundColor: '#dbeafe',
                  color: '#2563eb',
                  fontWeight: 'bold'
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Events for {format(selectedDate, 'MMMM dd, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDateEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="font-medium">{event.name}</span>
                    <Badge className={getEventTypeColor(event.type)}>
                      {event.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No events scheduled for this date</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Holidays */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Holidays</CardTitle>
          <CardDescription>National and religious holidays this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {calendarData.holidays.map((holiday, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{holiday.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(holiday.date, 'MMMM dd, yyyy')}
                  </p>
                </div>
                <Badge className={getEventTypeColor(holiday.type)}>
                  {holiday.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Event Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* This Month */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">This Month</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{calendarData.holidays.length}</p>
                  <p className="text-sm text-red-600">Holidays</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50">
                  <p className="text-2xl font-bold text-blue-600">{calendarData.events.length}</p>
                  <p className="text-sm text-blue-600">Events</p>
                </div>
              </div>
            </div>

            {/* Next Month */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Next Month</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-600">
                    {calendarData.holidays.filter(h => {
                      const nextMonth = new Date()
                      nextMonth.setMonth(nextMonth.getMonth() + 1)
                      return h.date.getMonth() === nextMonth.getMonth() &&
                        h.date.getFullYear() === nextMonth.getFullYear()
                    }).length}
                  </p>
                  <p className="text-sm text-red-600">Holidays</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50">
                  <p className="text-2xl font-bold text-blue-600">
                    {calendarData.events.filter(e => {
                      const nextMonth = new Date()
                      nextMonth.setMonth(nextMonth.getMonth() + 1)
                      return e.date.getMonth() === nextMonth.getMonth() &&
                        e.date.getFullYear() === nextMonth.getFullYear()
                    }).length}
                  </p>
                  <p className="text-sm text-blue-600">Events</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
