package com.elif.services.events.implementations;

import com.elif.dto.events.request.EligibilityRuleRequest;
import com.elif.entities.events.*;
import com.elif.repositories.events.EventEligibilityRuleRepository;
import com.elif.repositories.events.EventParticipantRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * ═══════════════════════════════════════════════════════════════════
 *  SERVICE MÉTIER — Moteur de règles d'éligibilité avec seuils
 * ═══════════════════════════════════════════════════════════════════
 *
 *  SCÉNARIO COMPLET — Championnat Bergers 2025 :
 *
 *  Règles admin sur catégorie "Compétition canine" :
 *    → ALLOWED_BREEDS       = BERGER_ALLEMAND,BERGER_BELGE,HUSKY  [bloquant]
 *    → MIN_AGE_MONTHS       = 12                                   [bloquant]
 *    → VACCINATION_REQUIRED = true                                  [bloquant]
 *    → LICENSE_REQUIRED     = true                                  [avertissement]
 *    → MIN_WEIGHT_KG        = 20                                    [avertissement]
 *
 *  Résultats :
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │ Rex — Pit Bull, 8m, non vacciné                                │
 *  │   Score 0/100  → INELIGIBLE  → ❌ Rejet immédiat              │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ Luna — Berger Belge, 18m, vaccinée, pas de license, 18kg       │
 *  │   Score 52/100 → WARNING     → ⏳ Dossier → admin             │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ Max — Berger Allemand, 24m, vacciné, license, 32kg             │
 *  │   Score 95/100 → ELIGIBLE    → ✅ Admission automatique        │
 *  └────────────────────────────────────────────────────────────────┘
 *
 *  SEUILS DE SCORE :
 *    score  < 40  → AdmissionDecision.REJECTED   (rejet immédiat — score trop faible)
 *    score 40–69  → AdmissionDecision.PENDING    (admin examine le dossier)
 *    score ≥ 70   → AdmissionDecision.AUTO_ADMIT (admission directe, CONFIRMED)
 *
 *  Ces seuils s'appliquent MÊME si aucune violation bloquante :
 *  Un dossier ELIGIBLE avec score 35 est quand même rejeté.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class EventEligibilityService {

    private final EventEligibilityRuleRepository ruleRepository;
    private final EventParticipantRepository     participantRepository;

    // ── Seuils configurables ──────────────────────────────────────────
    public static final int THRESHOLD_AUTO_REJECT = 40;  // < 40 → rejet
    public static final int THRESHOLD_AUTO_ADMIT  = 70;  // ≥ 70 → admission auto

    // ─────────────────────────────────────────────────────────────────
    // MÉTHODE PRINCIPALE
    // ─────────────────────────────────────────────────────────────────

    public EligibilityResult evaluate(Event event, PetRegistrationData pet, Long userId) {
        Long categoryId = event.getCategory() != null ? event.getCategory().getId() : null;

        // 1 seule requête SQL pour toutes les règles applicables
        List<EventEligibilityRule> rules = categoryId != null
                ? ruleRepository.findAllApplicableRules(event.getId(), categoryId)
                : ruleRepository.findActiveByEventId(event.getId());

        if (rules.isEmpty()) {
            log.debug("✅ Aucune règle — accès libre '{}'", event.getTitle());
            return EligibilityResult.freeAccess(event.getId());
        }

        log.info("🔍 {} règle(s) à évaluer pour '{}' (userId={})",
                rules.size(), event.getTitle(), userId);

        List<RuleViolation> hardViolations = new ArrayList<>();
        List<RuleViolation> softViolations = new ArrayList<>();
        List<String>        satisfied      = new ArrayList<>();
        int totalWeight = 0, earnedWeight = 0;

        for (EventEligibilityRule rule : rules) {
            int weight = ruleWeight(rule);
            totalWeight += weight;
            RuleCheckResult check = evaluateOne(rule, pet, userId, event.getId());

            if (check.passed()) {
                earnedWeight += weight;
                satisfied.add(check.successMessage());
                log.debug("  ✓ {}", rule.getCriteria());
            } else {
                RuleViolation v = new RuleViolation(rule.getCriteria(), check.failureMessage(), rule.isHardReject());
                if (rule.isHardReject()) { hardViolations.add(v); log.info("  ✗ {} BLOQUANT: {}", rule.getCriteria(), check.failureMessage()); }
                else                     { softViolations.add(v); log.info("  ⚠ {} avert.: {}", rule.getCriteria(), check.failureMessage()); }
            }
        }

        int score = totalWeight > 0
                ? (int) Math.round((earnedWeight * 100.0) / totalWeight) : 100;

        // Violation bloquante → INELIGIBLE + REJECTED quelle que soit la note
        if (!hardViolations.isEmpty()) {
            log.info("❌ INELIGIBLE '{}' score={}/100", event.getTitle(), score);
            List<RuleViolation> all = new ArrayList<>(hardViolations);
            all.addAll(softViolations);
            return EligibilityResult.ineligible(event.getId(), score, all, satisfied);
        }

        // Pas de violation bloquante → la décision dépend du score
        boolean hasWarnings      = !softViolations.isEmpty();
        AdmissionDecision decision = computeDecision(score, hasWarnings);

        log.info("{} '{}' score={}/100 decision={}",
                hasWarnings ? "⚠️ WARNING" : "✅ ELIGIBLE",
                event.getTitle(), score, decision);

        return hasWarnings
                ? EligibilityResult.warning(event.getId(), score, softViolations, satisfied, decision)
                : EligibilityResult.eligible(event.getId(), score, satisfied, decision);
    }

    // ─────────────────────────────────────────────────────────────────
    // DÉCISION D'ADMISSION PAR SCORE
    // ─────────────────────────────────────────────────────────────────

    /**
     * Traduit le score en décision métier concrète.
     *
     * Cas importants :
     *  - Score 35, pas de violations bloquantes → REJECTED quand même
     *    (trop faible pour la compétition, même si les races sont ok)
     *  - Score 72, quelques warnings → PENDING
     *    (l'admin doit vérifier les avertissements avant d'accepter)
     *  - Score 90, aucun warning → AUTO_ADMIT
     *    (dossier parfait, confirmation immédiate)
     */
    // Dans EventEligibilityService.java


// Remplacez la méthode computeDecision par celle-ci :

    public AdmissionDecision computeDecision(int score, boolean hasWarnings) {
        // Score < 40 → REJET IMMÉDIAT
        if (score < THRESHOLD_AUTO_REJECT) {
            return AdmissionDecision.REJECTED;
        }

        // Score 40-69 → PENDING (admin doit approuver)
        if (score >= THRESHOLD_AUTO_REJECT && score < THRESHOLD_AUTO_ADMIT) {
            return AdmissionDecision.PENDING;
        }

        // Score ≥ 70 → AUTO_ADMIT (accepté automatiquement)
        return AdmissionDecision.AUTO_ADMIT;
    }

    // ─────────────────────────────────────────────────────────────────
    // CRUD RÈGLES
    // ─────────────────────────────────────────────────────────────────

    public List<EventEligibilityRule> getRulesByEvent(Long eventId) {
        return ruleRepository.findActiveByEventId(eventId);
    }

    public List<EventEligibilityRule> getRulesByCategory(Long categoryId) {
        return ruleRepository.findActiveByCategoryId(categoryId);
    }

    public Optional<EventEligibilityRule> getRuleById(Long ruleId) {
        return ruleRepository.findById(ruleId);
    }

    @Transactional
    public EventEligibilityRule createRule(EligibilityRuleRequest request) {
        // Anti-doublon
        if (request.getEventId() != null &&
                ruleRepository.existsActiveByEventIdAndCriteria(request.getEventId(), request.getCriteria()))
            throw new IllegalArgumentException(
                    "Rule " + request.getCriteria() + " already exists for this event.");
        if (request.getCategoryId() != null &&
                ruleRepository.existsActiveByCategoryIdAndCriteria(request.getCategoryId(), request.getCriteria()))
            throw new IllegalArgumentException(
                    "Rule " + request.getCriteria() + " already exists for this category.");

        EventEligibilityRule rule = EventEligibilityRule.builder()
                .criteria(request.getCriteria())
                .valueType(request.getValueType())
                .listValues(request.getListValues())
                .numericValue(request.getNumericValue())
                .booleanValue(request.getBooleanValue())
                .hardReject(Boolean.TRUE.equals(request.getHardReject()))
                .rejectionMessage(request.getRejectionMessage())
                .priority(request.getPriority() != null ? request.getPriority() : 0)
                .active(true)
                .build();

        // ✅ AJOUTER CES LIGNES
        if (request.getEventId() != null) {
            Event event = new Event();
            event.setId(request.getEventId());
            rule.setEvent(event);
        }

        if (request.getCategoryId() != null) {
            EventCategory category = new EventCategory();
            category.setId(request.getCategoryId());
            rule.setCategory(category);
        }

        return ruleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Long ruleId) { ruleRepository.deleteById(ruleId); }

    @Transactional
    public void deactivateRule(Long ruleId) {
        ruleRepository.findById(ruleId).ifPresent(r -> { r.setActive(false); ruleRepository.save(r); });
    }

    // ─────────────────────────────────────────────────────────────────
    // ÉVALUATION D'UNE RÈGLE
    // ─────────────────────────────────────────────────────────────────

    private RuleCheckResult evaluateOne(EventEligibilityRule rule, PetRegistrationData pet,
                                        Long userId, Long eventId) {
        return switch (rule.getCriteria()) {
            case ALLOWED_BREEDS    -> list(pet.breed(),   rule, "Breed allowed", "Breed not allowed: \"%s\". Accepted: %s");
            case FORBIDDEN_BREEDS  -> forbid(pet.breed(), rule, "Breed OK",      "Breed forbidden: \"%s\"");
            case ALLOWED_SPECIES   -> list(pet.species(), rule, "Species allowed","Species not allowed: \"%s\". Accepted: %s");
            case MIN_AGE_MONTHS    -> min(pet.ageMonths(), rule, "Age OK (%d months)", "Age too low: %d months (min %d)");
            case MAX_AGE_MONTHS    -> max(pet.ageMonths(), rule, "Age OK (%d months)", "Too old: %d months (max %d)");
            case MIN_WEIGHT_KG     -> min(toInt(pet.weightKg()), rule, "Weight OK", "Weight too low: " + pet.weightKg() + "kg (min %d kg)");
            case MAX_WEIGHT_KG     -> max(toInt(pet.weightKg()), rule, "Weight OK", "Too heavy: " + pet.weightKg() + "kg (max %d kg)");
            case VACCINATION_REQUIRED  -> bool(pet.isVaccinated(),  rule, "Vaccination confirmed",  "Vaccination is mandatory");
            case LICENSE_REQUIRED      -> bool(pet.hasLicense(),     rule, "License provided",       "License/pedigree required (LOF etc.)");
            case MEDICAL_CERT_REQUIRED -> bool(pet.hasMedicalCert(),rule, "Medical cert provided",  "Veterinary certificate required");
            case ALLOWED_SEXES         -> list(pet.sex(),   rule, "Sex allowed",   "Sex not allowed: \"%s\". Accepted: %s");
            case MIN_EXPERIENCE_LEVEL  -> min(pet.experienceLevel(), rule, "Level OK (%d/5)", "Level too low: %d/5 (min %d/5)");
            case MAX_PARTICIPANTS_PER_OWNER -> ownerLimit(userId, eventId, rule);
            case SAME_OWNER_RESTRICTION     -> sameOwner(userId, eventId, rule);
            case ALLOWED_COLORS    -> list(pet.color(),   rule, "Color allowed",   "Color not allowed: \"%s\". Accepted: %s");
            case FORBIDDEN_COLORS  -> forbid(pet.color(), rule, "Color OK",        "Color forbidden: \"%s\"");
        };
    }

    private RuleCheckResult list(String v, EventEligibilityRule r, String ok, String fail) {
        if (v == null || v.isBlank()) return RuleCheckResult.fail("Missing value for " + r.getCriteria());
        if (r.containsInList(v)) return RuleCheckResult.pass(ok);
        return RuleCheckResult.fail(msg(r, fail.formatted(v, String.join(", ", r.getListValuesAsList()))));
    }

    private RuleCheckResult forbid(String v, EventEligibilityRule r, String ok, String fail) {
        if (v == null || v.isBlank() || !r.containsInList(v)) return RuleCheckResult.pass(ok);
        return RuleCheckResult.fail(msg(r, fail.formatted(v)));
    }

    private RuleCheckResult min(Integer v, EventEligibilityRule r, String ok, String fail) {
        if (v == null) return RuleCheckResult.fail("Missing value for " + r.getCriteria());
        return v >= r.getNumericValue()
                ? RuleCheckResult.pass(ok.formatted(v))
                : RuleCheckResult.fail(msg(r, fail.formatted(v, r.getNumericValue())));
    }

    private RuleCheckResult max(Integer v, EventEligibilityRule r, String ok, String fail) {
        if (v == null) return RuleCheckResult.fail("Missing value for " + r.getCriteria());
        return v <= r.getNumericValue()
                ? RuleCheckResult.pass(ok.formatted(v))
                : RuleCheckResult.fail(msg(r, fail.formatted(v, r.getNumericValue())));
    }

    private RuleCheckResult bool(Boolean v, EventEligibilityRule r, String ok, String fail) {
        return (!Boolean.TRUE.equals(r.getBooleanValue()) || Boolean.TRUE.equals(v))
                ? RuleCheckResult.pass(ok)
                : RuleCheckResult.fail(msg(r, fail));
    }

    private RuleCheckResult ownerLimit(Long userId, Long eventId, EventEligibilityRule r) {
        if (r.getNumericValue() == null) return RuleCheckResult.pass("No limit");
        long c = participantRepository.findAllByEventIdAndUserId(eventId, userId).size();
        return c < r.getNumericValue()
                ? RuleCheckResult.pass("Registrations OK (%d/%d)".formatted(c, r.getNumericValue()))
                : RuleCheckResult.fail(msg(r, "Max registrations reached (%d)".formatted(r.getNumericValue())));
    }

    private RuleCheckResult sameOwner(Long userId, Long eventId, EventEligibilityRule r) {
        if (!Boolean.TRUE.equals(r.getBooleanValue())) return RuleCheckResult.pass("No restriction");
        return participantRepository.findAllByEventIdAndUserId(eventId, userId).isEmpty()
                ? RuleCheckResult.pass("No other animal from this owner")
                : RuleCheckResult.fail(msg(r, "Only one animal per owner allowed"));
    }

    private int ruleWeight(EventEligibilityRule r) {
        return switch (r.getCriteria()) {
            case ALLOWED_BREEDS, FORBIDDEN_BREEDS -> 30;
            case ALLOWED_SPECIES                  -> 28;
            case VACCINATION_REQUIRED             -> 25;
            case LICENSE_REQUIRED                 -> 20;
            case MEDICAL_CERT_REQUIRED            -> 18;
            case MIN_AGE_MONTHS, MAX_AGE_MONTHS   -> 20;
            case MIN_WEIGHT_KG,  MAX_WEIGHT_KG    -> 15;
            case ALLOWED_SEXES                    -> 12;
            case MIN_EXPERIENCE_LEVEL             -> 10;
            case ALLOWED_COLORS, FORBIDDEN_COLORS ->  8;
            case MAX_PARTICIPANTS_PER_OWNER,
                 SAME_OWNER_RESTRICTION           ->  5;
        };
    }

    private String msg(EventEligibilityRule r, String def) {
        String c = r.getRejectionMessage();
        return (c != null && !c.isBlank()) ? c : def;
    }

    private Integer toInt(Double v) { return v != null ? v.intValue() : null; }

    // ─────────────────────────────────────────────────────────────────
    // TYPES PUBLICS
    // ─────────────────────────────────────────────────────────────────

    public record PetRegistrationData(
            String  petName,
            String  breed,
            String  species,
            Integer ageMonths,
            Double  weightKg,
            Boolean isVaccinated,
            Boolean hasLicense,
            Boolean hasMedicalCert,
            String  sex,
            Integer experienceLevel,
            String  color,
            String  additionalInfo
    ) {}

    /**
     * Décision d'admission — traduit le score en action concrète côté service.
     *
     * AUTO_ADMIT → ParticipantStatus.CONFIRMED  (inscription directe)
     * PENDING    → ParticipantStatus.PENDING    (admin examine)
     * REJECTED   → Exception levée              (pas de participant créé)
     */
    public enum AdmissionDecision { AUTO_ADMIT, PENDING, REJECTED }

    private record RuleCheckResult(boolean passed, String successMessage, String failureMessage) {
        static RuleCheckResult pass(String m) { return new RuleCheckResult(true,  m,    null); }
        static RuleCheckResult fail(String m) { return new RuleCheckResult(false, null, m);    }
    }

    public record RuleViolation(RuleCriteria criteria, String message, boolean blocking) {}

    @Getter
    @Builder
    public static class EligibilityResult {

        public enum Verdict { ELIGIBLE, WARNING, INELIGIBLE }

        private final Long              eventId;
        private final Verdict           verdict;
        private final int               score;
        private final AdmissionDecision decision;
        private final List<RuleViolation> violations;
        private final List<String>      satisfiedRules;
        private final boolean           noRules;

        public boolean isEligible()   { return verdict == Verdict.ELIGIBLE; }
        public boolean isIneligible() { return verdict == Verdict.INELIGIBLE; }
        public boolean hasWarnings()  { return verdict == Verdict.WARNING; }
        public boolean isAutoAdmit()  { return decision == AdmissionDecision.AUTO_ADMIT; }
        public boolean isPending()    { return decision == AdmissionDecision.PENDING; }
        public boolean isRejected()   { return decision == AdmissionDecision.REJECTED || verdict == Verdict.INELIGIBLE; }

        public List<RuleViolation> getBlockingViolations() {
            return violations == null ? List.of() : violations.stream().filter(RuleViolation::blocking).toList();
        }
        public List<RuleViolation> getSoftViolations() {
            return violations == null ? List.of() : violations.stream().filter(v -> !v.blocking()).toList();
        }

        /** Message lisible pour l'utilisateur */
        public String getUserMessage() {
            if (noRules) return "No eligibility rules configured for this event.";
            return switch (verdict) {
                case INELIGIBLE -> "❌ Your animal does not meet the mandatory criteria. Registration rejected.";
                case WARNING, ELIGIBLE -> switch (decision) {
                    case REJECTED   -> "❌ Your score (" + score + "/100) is below the minimum required ("
                            + THRESHOLD_AUTO_REJECT + "/100). Registration rejected.";
                    case PENDING    -> "⏳ Your application (" + score + "/100) has been submitted and will be reviewed by the organizer.";
                    case AUTO_ADMIT -> "✅ All criteria met! Your registration is automatically confirmed. Score: " + score + "/100.";
                };
            };
        }

        static EligibilityResult freeAccess(Long id) {
            return builder().eventId(id).verdict(Verdict.ELIGIBLE).score(100)
                    .decision(AdmissionDecision.AUTO_ADMIT)
                    .violations(List.of()).satisfiedRules(List.of()).noRules(true).build();
        }

        static EligibilityResult eligible(Long id, int score, List<String> sat, AdmissionDecision d) {
            return builder().eventId(id).verdict(Verdict.ELIGIBLE).score(score).decision(d)
                    .violations(List.of()).satisfiedRules(sat).noRules(false).build();
        }

        static EligibilityResult warning(Long id, int score, List<RuleViolation> v,
                                         List<String> sat, AdmissionDecision d) {
            return builder().eventId(id).verdict(Verdict.WARNING).score(score).decision(d)
                    .violations(v).satisfiedRules(sat).noRules(false).build();
        }

        static EligibilityResult ineligible(Long id, int score, List<RuleViolation> v, List<String> sat) {
            return builder().eventId(id).verdict(Verdict.INELIGIBLE).score(score)
                    .decision(AdmissionDecision.REJECTED).violations(v).satisfiedRules(sat).noRules(false).build();
        }
    }
}