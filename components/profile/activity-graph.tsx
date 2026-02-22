import { cn } from '@/lib/utils'

interface ActivityGraphProps {
  matchDates: string[]
  weeks?: number
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

export function ActivityGraph({ matchDates, weeks = 20 }: ActivityGraphProps) {
  const countsMap = new Map<string, number>()
  for (const dateStr of matchDates) {
    const d = new Date(dateStr)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    countsMap.set(key, (countsMap.get(key) ?? 0) + 1)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDay = today.getDay()

  const totalDays = weeks * 7 + todayDay + 1
  const grid: { key: string; count: number; date: Date }[] = []

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    grid.push({ key, count: countsMap.get(key) ?? 0, date: new Date(d) })
  }

  const columns: { key: string; count: number; date: Date }[][] = []
  for (let i = 0; i < grid.length; i += 7) {
    columns.push(grid.slice(i, i + 7))
  }

  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  for (let col = 0; col < columns.length; col++) {
    const firstDay = columns[col][0]
    if (!firstDay) continue
    const month = firstDay.date.getMonth()
    if (month !== lastMonth) {
      lastMonth = month
      monthLabels.push({
        label: firstDay.date.toLocaleDateString('en-US', { month: 'short' }),
        col,
      })
    }
  }

  const maxCount = Math.max(1, ...grid.map(d => d.count))

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        {/* Month labels */}
        <div className="flex" style={{ paddingLeft: 28 }}>
          {monthLabels.map(({ label, col }, i) => {
            const nextCol = i < monthLabels.length - 1 ? monthLabels[i + 1].col : columns.length
            const span = nextCol - col
            return (
              <div
                key={`${label}-${col}`}
                className="text-[10px] text-muted-foreground"
                style={{ width: span * 14 }}
              >
                {label}
              </div>
            )
          })}
        </div>

        {/* Grid */}
        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 pr-1.5">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="flex h-[10px] w-5 items-center justify-end">
                <span className="text-[9px] leading-none text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Weeks */}
          {columns.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-0.5">
              {week.map((day) => (
                <div
                  key={day.key}
                  title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: ${day.count} game${day.count !== 1 ? 's' : ''}`}
                  className={cn(
                    'h-[10px] w-[10px] rounded-[2px] transition-colors',
                    day.count === 0 && 'bg-secondary'
                  )}
                  style={day.count > 0 ? {
                    backgroundColor: `oklch(0.55 0.14 25 / ${intensityForCount(day.count, maxCount)})`,
                  } : undefined}
                />
              ))}
              {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                <div key={`pad-${i}`} className="h-[10px] w-[10px]" />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <span className="text-[10px] text-muted-foreground">Less</span>
          <div className="h-[10px] w-[10px] rounded-[2px] bg-secondary" />
          {[0.25, 0.45, 0.65, 0.85, 1].map((opacity) => (
            <div
              key={opacity}
              className="h-[10px] w-[10px] rounded-[2px]"
              style={{ backgroundColor: `oklch(0.55 0.14 25 / ${opacity})` }}
            />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  )
}

function intensityForCount(count: number, max: number): number {
  if (count === 0) return 0
  const ratio = count / max
  return 0.25 + ratio * 0.75
}
