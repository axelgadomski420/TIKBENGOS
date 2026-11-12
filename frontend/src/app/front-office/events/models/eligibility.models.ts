
export interface RuleViolation {
  criteria: string;
  message: string;
  blocking: boolean;
}

export type Verdict = 'ELIGIBLE' | 'WARNING' | 'INELIGIBLE';
export type AdmissionDecision = 'AUTO_ADMIT' | 'PENDING' | 'REJECTED';

/**
 * Résultat renvoyé par GET /api/eligibility-rules/check/{eventId}
 * Correspond exactement à EligibilityResult.java
 */
export interface EligibilityResult {
  eventId:        number;
  verdict:        Verdict;
  score:          number;         // 0-100
  decision:       AdmissionDecision;

  violations:     RuleViolation[];
  satisfiedRules: string[];
  noRules:        boolean;

  // Helpers calculés côté backend
  eligible:       boolean;       // verdict === ELIGIBLE
  ineligible:     boolean;       // verdict === INELIGIBLE
  hasWarnings:    boolean;       // verdict === WARNING
  autoAdmit:      boolean;       // decision === AUTO_ADMIT
  pending:        boolean;       // decision === PENDING
  rejected:       boolean;       // decision === REJECTED ou verdict === INELIGIBLE

  userMessage:    string;        // Message prêt à afficher

 thresholdAutoReject?: number;   // ← ajouter ?
  thresholdAutoAdmit?:  number;   // ← ajouter ?
}