'use client'

import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ExportMenuProps = {
  csvLabel?: string
  pdfLabel?: string
  onCsv: () => void
  onPdf?: () => void
}

export function ExportMenu({
  csvLabel = 'Export CSV',
  pdfLabel = 'Save PDF',
  onCsv,
  onPdf,
}: ExportMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onCsv}>
        <Download className="h-4 w-4" />
        {csvLabel}
      </Button>
      {onPdf && (
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onPdf}>
          <FileText className="h-4 w-4" />
          {pdfLabel}
        </Button>
      )}
    </div>
  )
}
