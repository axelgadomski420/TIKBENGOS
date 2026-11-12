

export type VirtualSessionStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

export interface VirtualSessionResponse {
  id: number;
  eventId: number;
  eventTitle: string;
  roomUrl: string | null;           // null si l'utilisateur n'est pas participant confirmé
  earlyAccessMinutes: number;
  attendanceThresholdPercent: number;
  status: VirtualSessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  accessWindowStart: string;        // startDate - earlyAccessMinutes
  accessWindowEnd: string;          // endDate + 5 min
  canJoinNow: boolean;
  statusMessage: string;
}

export interface JoinSessionResponse {
  roomUrl: string;
  accessToken: string;
  joinedAt: string;
  message: string;
}

export interface AttendanceResponse {
  userId: number;
  userName: string;
  sessionId: number;
  joinedAt: string;
  leftAt: string | null;
  totalMinutesPresent: number;
  attendancePercent: number | null;
  certificateEarned: boolean;
  certificateUrl: string | null;
  currentlyConnected: boolean;
}

export interface SessionStatsResponse {
  sessionId: number;
  eventTitle: string;
  totalRegistered: number;
  totalJoined: number;
  averageAttendance: number;
  certificatesEarned: number;
  participantDetails: AttendanceResponse[];
}

export interface CreateVirtualSessionRequest {
  earlyAccessMinutes: number;
  attendanceThresholdPercent: number;
  externalRoomUrl?: string | null;
}
