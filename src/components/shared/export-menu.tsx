'use client'

import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ExportMenuProps = {
  csvLabel?: string
  pdfLabel?: string
  onCsv: () => void
  onPdf?: () => void
}

export function ExportMenu({
  csvLabel = 'Export CSV',
  pdfLabel = 'Print / Save PDF',
  onCsv,
  onPdf,
}: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5" />
        }
      >
        <Download className="h-4 w-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onCsv}>
          <Download className="mr-2 h-4 w-4" />
          {csvLabel}
        </DropdownMenuItem>
        {onPdf && (
          <DropdownMenuItem onClick={onPdf}>
            <FileText className="mr-2 h-4 w-4" />
            {pdfLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
