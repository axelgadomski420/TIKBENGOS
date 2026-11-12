/**
 * TypeScript interface mirroring the backend TransitDashboardDTO.
 * Used by TransitStatisticsService and TransitOverviewComponent.
 */
export interface TransitDashboardModel {
  // Destinations
  totalDestinations: number;
  publishedDestinations: number;
  scheduledDestinations: number;
  draftDestinations: number;
  archivedDestinations: number;

  // Travel Plans
  totalTravelPlans: number;
  submittedPlans: number;
  inPreparationPlans: number;
  approvedPlans: number;
  rejectedPlans: number;
  completedPlans: number;

  // Feedback
  totalFeedback: number;
  reviewCount: number;
  suggestionCount: number;
  incidentCount: number;
  complaintCount: number;
  openFeedback: number;
  resolvedFeedback: number;
}
