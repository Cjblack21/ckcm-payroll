"use client"

import { useState, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CollapsibleButtonGroupProps {
  children: ReactNode
  defaultExpanded?: boolean
}

export function CollapsibleButtonGroup({ 
  children, 
  defaultExpanded = true 
}: CollapsibleButtonGroupProps) {
  const [showButtons, setShowButtons] = useState(defaultExpanded)

  return (
    <div className="flex gap-2">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline"
          onClick={() => setShowButtons(!showButtons)}
          className="flex items-center gap-2"
        >
          {showButtons ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          <span className="text-sm">{showButtons ? 'Hide' : 'Show'}</span>
        </Button>
      </div>
      
      <div className={`flex gap-2 overflow-hidden transition-all duration-300 ease-in-out ${
        showButtons ? 'max-w-[800px] opacity-100' : 'max-w-0 opacity-0'
      }`}>
        {children}
      </div>
    </div>
  )
}
