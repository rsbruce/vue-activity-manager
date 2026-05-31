declare global {
    interface Date {
        isoDate(): string
        isoTime(): string
        addDays(days: number): Date
        addHours(hours: number): Date
        addMinutes(minutes: number): Date
        isWeekend(): boolean
    }
}

Date.prototype.isoDate = function (): string {
    const y = this.getFullYear()
    const m = String(this.getMonth() + 1).padStart(2, '0')
    const d = String(this.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

Date.prototype.isoTime = function (): string {
    const h = String(this.getHours()).padStart(2, '0')
    const m = String(this.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
}

Date.prototype.addDays = function (days: number): Date {
    const date = new Date(this.valueOf())
    date.setDate(date.getDate() + days)
    return date
}

Date.prototype.addHours = function (hours: number): Date {
    const date = new Date(this.valueOf())
    date.setHours(date.getHours() + hours)
    return date
}

Date.prototype.addMinutes = function (minutes: number): Date {
    const date = new Date(this.valueOf())
    date.setMinutes(date.getMinutes() + minutes)
    return date
}

Date.prototype.isWeekend = function (): boolean {
    return !(this.getDay() % 6)
}

export {}
