import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { Event } from '@/types/events'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 'YYYY-MM-DDTHH:mm' -> 'Mon 12 Sep 2026'
function dateLabel(dt: string): string {
    const [y, m, d] = dt.slice(0, 10).split('-').map(Number)
    return `${WEEKDAYS[new Date(y!, m! - 1, d!).getDay()]} ${d} ${MONTHS[m! - 1]} ${y}`
}
const timeOf = (dt: string) => dt.slice(11, 16)
// 'YYYY-MM-DD' -> 'DD/MM/YYYY'
function ddmmyyyy(iso: string): string {
    const [y, m, d] = iso.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
}

// Whole minutes between two local datetime strings; a full parse handles events
// that cross midnight. Clamped at 0.
function minutesBetween(start: string, end: string): number {
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
}
// minutes -> 'H:MM'
function hm(mins: number): string {
    return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

// Build a timesheet PDF for one project over a date range and hand it to the
// user: a normal download on the web, or (since the Capacitor WebView blocks
// <a download>) written to cache and offered via the share sheet on native.
export async function exportTimesheetPdf(opts: {
    title: string
    projectName: string
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
    events: Event[]
}): Promise<void> {
    const doc = new jsPDF()
    let y = 16
    if (opts.title.trim()) {
        doc.setFontSize(18)
        doc.text(opts.title.trim(), 14, y)
        y += 9
    }
    doc.setFontSize(10)
    doc.text(`${ddmmyyyy(opts.start)} to ${ddmmyyyy(opts.end)} inclusive`, 14, y)

    const usable = opts.events.filter((e) => e.start_datetime && e.end_datetime)
    if (usable.length) {
        let total = 0
        const body = usable.map((e) => {
            const mins = minutesBetween(e.start_datetime!, e.end_datetime!)
            total += mins
            return [dateLabel(e.start_datetime!), `${timeOf(e.start_datetime!)}-${timeOf(e.end_datetime!)}`, hm(mins)]
        })
        autoTable(doc, {
            startY: y + 6,
            head: [['Date', 'Start-End', 'Duration']],
            body,
            foot: [['', 'Total', hm(total)]],
        })
    } else {
        doc.text('No entries for this period.', 14, y + 10)
    }

    const filename = `timesheet-${opts.projectName}-${opts.start}-${opts.end}.pdf`.replace(/[^a-zA-Z0-9._-]+/g, '_')

    if (Capacitor.isNativePlatform()) {
        const base64 = doc.output('datauristring').split(',')[1] ?? ''
        const written = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache })
        await Share.share({ title: opts.title.trim() || 'Timesheet', url: written.uri, dialogTitle: 'Export timesheet' })
    } else {
        doc.save(filename)
    }
}
