export type ActivityType = {
  id: string
  name: string
  polarity: boolean | null
  theme: string
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export type Activity = {
  id: string
  name: string
  activity_type_id: string
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export type ActivityOnDay = {
  activity_id: string
  date: string
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export type ActivityWithType = Activity & { activityType: ActivityType | null }

export type ActivityTypeGroup = {
  activityType: ActivityType
  activities: Activity[]
}
