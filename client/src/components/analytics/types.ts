export interface AnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  completedVisits: number;
  activeVisits: number;
  averageVisitDuration: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  count: number;
  active: number;
  completed: number;
  avgDuration: number;
}

export interface HourlyDistribution {
  hour: string;
  count: number;
}

export interface DayOfWeekDistribution {
  day: string;
  count: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  timeSeries: TimeSeriesDataPoint[];
  byHour: HourlyDistribution[];
  byDayOfWeek: DayOfWeekDistribution[];
}

export interface ExportedVisit {
  VisitorName: string;
  Email: string;
  Phone: string;
  YearOfBirth: number;
  CheckInTime: string;
  CheckOutTime: string;
  VisitStatus: string;
  VisitDuration: number | string;
}