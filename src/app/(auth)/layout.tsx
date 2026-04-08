export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),linear-gradient(135deg,#090909,#141414)] p-4 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[36px] border border-white/10 bg-black shadow-[0_42px_120px_-48px_rgba(0,0,0,0.75)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden px-10 py-12 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.13),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_24%)]" />

          <div className="relative space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white text-sm font-black tracking-[0.22em] text-black">
                B
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/45">
                  Agency OS
                </p>
                <p className="font-heading text-xl font-semibold tracking-tight">BLYFT CRM</p>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/45">
                Professional CRM environment
              </p>
              <h1 className="font-heading text-5xl font-semibold tracking-tight leading-tight">
                Run the agency from one focused workspace.
              </h1>
              <p className="text-base leading-8 text-white/68">
                Track clients, delivery, leads, reimbursements, and revenue in a presentation-ready control room built for internal operations.
              </p>
            </div>
          </div>

          <div className="relative grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Pipeline',
                note: 'Lead capture and team follow-up in one flow.',
              },
              {
                label: 'Delivery',
                note: 'Projects, tasks, and accountability live together.',
              },
              {
                label: 'Finance',
                note: 'Revenue, expenses, and approvals stay visible.',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">
                  {item.label}
                </p>
                <p className="mt-3 text-sm leading-6 text-white/72">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center bg-[linear-gradient(180deg,#ffffff,#f5f4f2)] px-6 py-10 text-foreground sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}
