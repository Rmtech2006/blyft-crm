type CsvValue = string | number | boolean | null | undefined

type CsvColumn<T> = {
  header: string
  value: (item: T) => CsvValue
}

type PrintableSection = {
  title: string
  columns: string[]
  rows: Array<Array<CsvValue>>
}

function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return ''

  const normalized = String(value).replace(/\r?\n/g, ' ').trim()
  if (normalized.includes(',') || normalized.includes('"')) {
    return `"${normalized.replace(/"/g, '""')}"`
  }

  return normalized
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportCsv<T>(
  filename: string,
  items: T[],
  columns: CsvColumn<T>[]
) {
  const rows = [
    columns.map((column) => escapeCsvValue(column.header)).join(','),
    ...items.map((item) =>
      columns.map((column) => escapeCsvValue(column.value(item))).join(',')
    ),
  ]

  downloadBlob(filename, new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }))
}

export function printReport(options: {
  title: string
  subtitle?: string
  sections: PrintableSection[]
}) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1120,height=780')
  if (!popup) return false

  const styles = `
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 40px;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #171717;
        background: #ffffff;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
        letter-spacing: -0.03em;
      }
      p.meta {
        margin: 0 0 24px;
        color: #525252;
        font-size: 14px;
      }
      section {
        margin-top: 28px;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 16px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #525252;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #d4d4d4;
      }
      th, td {
        padding: 10px 12px;
        border: 1px solid #e5e5e5;
        text-align: left;
        font-size: 13px;
        vertical-align: top;
      }
      th {
        background: #f5f5f5;
        font-weight: 600;
      }
      @media print {
        body { padding: 24px; }
      }
    </style>
  `

  const sectionsHtml = options.sections
    .map(
      (section) => `
        <section>
          <h2>${section.title}</h2>
          <table>
            <thead>
              <tr>${section.columns.map((column) => `<th>${column}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${section.rows
                .map(
                  (row) =>
                    `<tr>${row
                      .map((cell) => `<td>${escapeCsvValue(cell)}</td>`)
                      .join('')}</tr>`
                )
                .join('')}
            </tbody>
          </table>
        </section>
      `
    )
    .join('')

  popup.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${options.title}</title>
        ${styles}
      </head>
      <body>
        <h1>${options.title}</h1>
        <p class="meta">${options.subtitle ?? ''}</p>
        ${sectionsHtml}
      </body>
    </html>
  `)

  popup.document.close()
  popup.focus()
  popup.print()
  return true
}
