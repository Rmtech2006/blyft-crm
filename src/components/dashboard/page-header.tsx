import { ExportMenu } from '@/components/shared/export-menu'

export function DashboardPageHeader({
  onCsv,
  onPdf,
}: {
  onCsv: () => void
  onPdf: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="section-eyebrow">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
      </div>
      <ExportMenu onCsv={onCsv} onPdf={onPdf} />
    </div>
  )
}
