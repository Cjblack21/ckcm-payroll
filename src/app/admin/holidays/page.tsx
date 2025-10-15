"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
import { Calendar, Plus, Edit, Trash2, MapPin, Flag } from "lucide-react"
import { toast } from "react-hot-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { SSRSafe } from "@/components/ssr-safe"

interface Holiday {
  holidays_id: string
  name: string
  date: string
  type: 'NATIONAL' | 'RELIGIOUS' | 'COMPANY'
  description?: string
  createdAt: string
}

interface PhilippinesHoliday {
  date: string
  name: string
  type: 'NATIONAL' | 'LOCAL'
  region?: string
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showHolidayDetails, setShowHolidayDetails] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'COMPANY' as 'NATIONAL' | 'RELIGIOUS' | 'COMPANY',
    description: ''
  })

  useEffect(() => {
    fetchHolidays()
  }, [])

  // Removed static Philippines holidays. The page now relies solely on DB holidays.

  const fetchHolidays = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/holidays')
      const data = await response.json()
      setHolidays(data.holidays || [])
    } catch (error) {
      console.error('Error fetching holidays:', error)
      toast.error('Failed to fetch holidays')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form data
    if (!formData.name.trim()) {
      toast.error('Please enter a holiday name')
      return
    }
    
    if (!formData.date) {
      toast.error('Please select a date')
      return
    }
    
    if (!formData.type) {
      toast.error('Please select a holiday type')
      return
    }
    
    try {
      const url = editingHoliday 
        ? `/api/admin/holidays/${editingHoliday.holidays_id}`
        : '/api/admin/holidays'
      
      const method = editingHoliday ? 'PUT' : 'POST'
      
      console.log('Submitting holiday data:', formData) // Debug log
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const responseData = await response.json()
      console.log('API Response:', responseData) // Debug log

      if (response.ok) {
        toast.success(editingHoliday ? 'Holiday updated successfully' : 'Holiday added successfully')
        fetchHolidays()
        resetForm()
      } else {
        const errorMessage = responseData.error || 'Failed to save holiday'
        console.error('API Error:', errorMessage)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Network Error:', error)
      toast.error('Network error. Please check your connection and try again.')
    }
  }

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday)
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0], // Convert to YYYY-MM-DD format
      type: holiday.type,
      description: holiday.description || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (holidayId: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return

    try {
      const response = await fetch(`/api/admin/holidays/${holidayId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Holiday deleted successfully')
        fetchHolidays()
      } else {
        toast.error('Failed to delete holiday')
      }
    } catch (error) {
      console.error('Error deleting holiday:', error)
      toast.error('Failed to delete holiday')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      type: 'COMPANY',
      description: ''
    })
    setEditingHoliday(null)
    setIsDialogOpen(false)
  }

  // Calendar helper functions
  const getHolidaysForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // Handle both string and Date formats for custom holidays
    const customHolidays = holidays.filter(h => {
      const holidayDate = h.date.split('T')[0] // Extract YYYY-MM-DD from ISO string
      return holidayDate === dateStr
    })
    
    return { customHolidays, phHolidays: [] }
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
        return 'bg-red-100 text-red-800'
      case 'RELIGIOUS':
        return 'bg-purple-100 text-purple-800'
      case 'COMPANY':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDateClick = (date: Date) => {
    const { customHolidays, phHolidays } = getHolidaysForDate(date)
    if (customHolidays.length > 0 || phHolidays.length > 0) {
      setSelectedDate(date)
      setShowHolidayDetails(true)
    }
  }

  const getSelectedDateHolidays = () => {
    if (!selectedDate) return { customHolidays: [], phHolidays: [] }
    return getHolidaysForDate(selectedDate)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Holidays Management</h1>
          <p className="text-muted-foreground">
            Manage holidays and special days for the payroll system
          </p>
        </div>
        <SSRSafe>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Holiday Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Christmas Day"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'NATIONAL' | 'RELIGIOUS' | 'COMPANY') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATIONAL">National Holiday</SelectItem>
                    <SelectItem value="RELIGIOUS">Religious Holiday</SelectItem>
                    <SelectItem value="COMPANY">Company Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this holiday"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </SSRSafe>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Holidays Table */}
        <div className="lg:col-span-2">
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Holidays Calendar
          </CardTitle>
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
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No holidays found. Add your first holiday to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  holidays
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
                        <TableCell>
                          {format(new Date(holiday.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(holiday)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(holiday.holidays_id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
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
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Philippines Holidays
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
                  const { customHolidays, phHolidays } = getHolidaysForDate(day)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isToday = isSameDay(day, new Date())
                  const hasHolidays = customHolidays.length > 0 || phHolidays.length > 0
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`
                        p-2 text-center text-xs border rounded cursor-pointer transition-colors
                        ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                        ${isToday ? 'bg-primary text-primary-foreground' : ''}
                        ${hasHolidays ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' : 'hover:bg-muted'}
                        ${!isCurrentMonth ? 'opacity-50' : ''}
                      `}
                    >
                      <div className="font-medium">{format(day, 'd')}</div>
                      {customHolidays.length > 0 && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1" title={`Custom Holiday: ${customHolidays.map(h => h.name).join(', ')}`} />
                      )}
                      {phHolidays.length > 0 && (
                        <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mt-1" title={`Philippines Holiday: ${phHolidays.map(h => h.name).join(', ')}`} />
                      )}
                      {hasHolidays && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {customHolidays.length + phHolidays.length} holiday{(customHolidays.length + phHolidays.length) > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Holidays</span>
                </div>
              </div>

              {/* Upcoming Holidays - removed static list; relies on DB table in main grid */}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Holiday Details Dialog */}
      <SSRSafe>
        <Dialog open={showHolidayDetails} onOpenChange={setShowHolidayDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Holidays on {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(() => {
                const { customHolidays, phHolidays } = getSelectedDateHolidays()
                return (
                  <>
                    {/* Custom Holidays */}
                    {customHolidays.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          Custom Holidays
                        </h4>
                        <div className="space-y-3">
                          {customHolidays.map((holiday, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-blue-50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-blue-900">{holiday.name}</h5>
                                  <p className="text-sm text-blue-700">
                                    {format(new Date(holiday.date), 'MMMM dd, yyyy')}
                                  </p>
                                  {holiday.description && (
                                    <p className="text-sm text-blue-600 mt-1">{holiday.description}</p>
                                  )}
                                </div>
                                <Badge className={getTypeColor(holiday.type)}>
                                  {holiday.type}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Philippines Holidays */}
                    {phHolidays.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          Philippines Holidays
                        </h4>
                        <div className="space-y-3">
                          {phHolidays.map((holiday, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-red-50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-red-900">{holiday.name}</h5>
                                  <p className="text-sm text-red-700">
                                    {format(new Date(holiday.date), 'MMMM dd, yyyy')}
                                  </p>
                                  {holiday.region && (
                                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {holiday.region}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {holiday.type === 'NATIONAL' ? (
                                    <Flag className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <MapPin className="h-4 w-4 text-blue-500" />
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {holiday.type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No holidays message */}
                    {customHolidays.length === 0 && phHolidays.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No holidays on this date</p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </SSRSafe>
    </div>
  )
}
