package com.elif.controllers.adoption;

import com.elif.dto.adoption.request.ContractRequestDTO;
import com.elif.dto.adoption.response.ContractResponseDTO;
import com.elif.entities.adoption.Contract;
import com.elif.entities.adoption.enums.ContractStatus;
import com.elif.services.adoption.interfaces.ContractService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/adoption/contracts")
@CrossOrigin(origins = "http://localhost:4200")
public class ContractController {

    private final ContractService contractService;

    // ============================================================
    // CONSTRUCTEUR
    // ============================================================

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    // ============================================================
    // MÉTHODES DE BASE CRUD
    // ============================================================

    @GetMapping
    public ResponseEntity<List<ContractResponseDTO>> getAllContracts() {
        List<Contract> contracts = contractService.findAll();
        List<ContractResponseDTO> response = contracts.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContractResponseDTO> getContractById(@PathVariable Long id) {
        Contract contract = contractService.findById(id);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @GetMapping("/numero/{numeroContrat}")
    public ResponseEntity<ContractResponseDTO> getContractByNumero(@PathVariable String numeroContrat) {
        Contract contract = contractService.findByNumeroContrat(numeroContrat);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @GetMapping("/shelter/{shelterId}")
    public ResponseEntity<List<ContractResponseDTO>> getContractsByShelter(@PathVariable Long shelterId) {
        List<Contract> contracts = contractService.findByShelterId(shelterId);
        List<ContractResponseDTO> response = contracts.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/adoptant/{adoptantId}")
    public ResponseEntity<List<ContractResponseDTO>> getContractsByAdoptant(@PathVariable Long adoptantId) {
        List<Contract> contracts = contractService.findByAdoptantId(adoptantId);
        List<ContractResponseDTO> response = contracts.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/animal/{animalId}")
    public ResponseEntity<ContractResponseDTO> getContractByAnimal(@PathVariable Long animalId) {
        Contract contract = contractService.findByAnimalId(animalId);
        if (contract == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<ContractResponseDTO>> getContractsByStatus(@PathVariable ContractStatus status) {
        List<Contract> contracts = contractService.findByStatus(status);
        List<ContractResponseDTO> response = contracts.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // ✅ CREATE CONTRACT - fraisAdoption optionnel (peut être null)
    @PostMapping
    public ResponseEntity<ContractResponseDTO> createContract(@RequestBody ContractRequestDTO request) {
        // Si fraisAdoption est null, on met 0 par défaut
        BigDecimal fraisAdoption = request.getFraisAdoption() != null ? request.getFraisAdoption() : BigDecimal.ZERO;

        Contract contract = contractService.create(
                request.getShelterId(),
                request.getAdoptantId(),
                request.getAnimalId(),
                fraisAdoption,
                request.getConditionsSpecifiques()
        );
        return new ResponseEntity<>(toResponseDTO(contract), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContractResponseDTO> updateContract(
            @PathVariable Long id,
            @RequestBody ContractRequestDTO request) {
        BigDecimal fraisAdoption = request.getFraisAdoption() != null ? request.getFraisAdoption() : BigDecimal.ZERO;
        Contract contract = contractService.update(id, request.getConditionsSpecifiques(), fraisAdoption);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    // ============================================================
    // MÉTHODES DE GESTION DES STATUTS
    // ============================================================

    @PutMapping("/{id}/send")
    public ResponseEntity<ContractResponseDTO> sendForSignature(@PathVariable Long id) {
        Contract contract = contractService.sendForSignature(id);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @PutMapping("/{id}/sign")
    public ResponseEntity<ContractResponseDTO> signContract(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        Contract contract = contractService.sign(id, userId);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<ContractResponseDTO> validateContract(@PathVariable Long id) {
        Contract contract = contractService.validate(id);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<ContractResponseDTO> activateContract(@PathVariable Long id) {
        Contract contract = contractService.activate(id);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @PutMapping("/{id}/terminate")
    public ResponseEntity<ContractResponseDTO> terminateContract(@PathVariable Long id) {
        Contract contract = contractService.terminate(id);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @PutMapping("/{id}/rescind")
    public ResponseEntity<ContractResponseDTO> rescindContract(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        Contract contract = contractService.rescind(id, userId);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ContractResponseDTO> cancelContract(@PathVariable Long id) {
        Contract contract = contractService.cancel(id);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    // ============================================================
    // MÉTHODES AVEC DÉTAILS
    // ============================================================

    @GetMapping("/details/{id}")
    public ResponseEntity<ContractResponseDTO> getContractByIdWithDetails(@PathVariable Long id) {
        Contract contract = contractService.findByIdWithDetails(id);
        return ResponseEntity.ok(toResponseDTO(contract));
    }

    @GetMapping("/status/{status}/details")
    public ResponseEntity<List<ContractResponseDTO>> getContractsByStatusWithDetails(@PathVariable ContractStatus status) {
        List<Contract> contracts = contractService.findContractsByStatusWithDetails(status);
        List<ContractResponseDTO> response = contracts.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // MÉTHODES DE STATISTIQUES
    // ============================================================

    @GetMapping("/stats/revenue/total")
    public ResponseEntity<BigDecimal> getTotalAdoptionFees() {
        return ResponseEntity.ok(contractService.calculateTotalAdoptionFees());
    }

    @GetMapping("/stats/revenue/shelter/{shelterId}")
    public ResponseEntity<BigDecimal> getRevenueByShelter(@PathVariable Long shelterId) {
        return ResponseEntity.ok(contractService.calculateRevenueByShelterId(shelterId));
    }

    @GetMapping("/stats/revenue/by-shelter")
    public ResponseEntity<List<Object[]>> getRevenueByShelter() {
        return ResponseEntity.ok(contractService.calculateRevenueByShelter());
    }

    @GetMapping("/stats/count/status")
    public ResponseEntity<List<Object[]>> getCountByStatus() {
        return ResponseEntity.ok(contractService.countByStatus());
    }

    @GetMapping("/stats/multiple-adopters")
    public ResponseEntity<List<Object[]>> getMultipleAdopters(@RequestParam(defaultValue = "2") int minAdoptions) {
        return ResponseEntity.ok(contractService.findMultipleAdopters(minAdoptions));
    }

    @GetMapping("/stats/by-pet-type")
    public ResponseEntity<List<Object[]>> getAdoptionsByPetType() {
        return ResponseEntity.ok(contractService.countAdoptionsByPetType());
    }

    @GetMapping("/stats/total")
    public ResponseEntity<Long> getTotalAdoptions() {
        return ResponseEntity.ok(contractService.countTotalAdoptions());
    }

    @GetMapping("/stats/by-month")
    public ResponseEntity<List<Object[]>> getAdoptionsByMonth() {
        return ResponseEntity.ok(contractService.countAdoptionsByMonth());
    }

    // ============================================================
    // MÉTHODE POUR TÉLÉCHARGER LE PDF DU CONTRAT
    // ============================================================

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadContractPdf(@PathVariable Long id) {
        try {
            Contract contract = contractService.findById(id);
            if (contract == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] pdfContent = contractService.generateContractPdf(id);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"contract-" + contract.getNumeroContrat() + ".pdf\"")
                    .body(pdfContent);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // ============================================================
    // MÉTHODES POUR CONTRATS PAR TEMPS
    // ============================================================

    @GetMapping("/expiring")
    public ResponseEntity<List<ContractResponseDTO>> getContractsExpiringSoon(@RequestParam(defaultValue = "30") int days) {
        List<Contract> contracts = contractService.findContractsExpiringSoon(days);
        List<ContractResponseDTO> response = contracts.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/signed-today")
    public ResponseEntity<List<ContractResponseDTO>> getContractsSignedToday() {
        List<Contract> contracts = contractService.findContractsSignedToday();
        List<ContractResponseDTO> response = contracts.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/without-document")
    public ResponseEntity<List<ContractResponseDTO>> getContractsWithoutDocument() {
        List<Contract> contracts = contractService.findContractsWithoutDocument();
        List<ContractResponseDTO> response = contracts.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // MÉTHODE DE CONVERSION
    // ============================================================

    private ContractResponseDTO toResponseDTO(Contract contract) {
        if (contract == null) {
            return null;
        }

        String adoptantName = "Utilisateur";
        if (contract.getAdoptant() != null) {
            adoptantName = contract.getAdoptant().getFirstName() + " " + contract.getAdoptant().getLastName();
        }

        String shelterName = contract.getShelter() != null ? contract.getShelter().getName() : null;
        String animalName = contract.getAnimal() != null ? contract.getAnimal().getName() : null;

        return ContractResponseDTO.builder()
                .id(contract.getId())
                .numeroContrat(contract.getNumeroContrat())
                .shelterId(contract.getShelter() != null ? contract.getShelter().getId() : null)
                .shelterName(shelterName)
                .adoptantId(contract.getAdoptant() != null ? contract.getAdoptant().getId() : null)
                .adoptantName(adoptantName)
                .animalId(contract.getAnimal() != null ? contract.getAnimal().getId() : null)
                .animalName(animalName)
                .dateSignature(contract.getDateSignature())
                .dateAdoption(contract.getDateAdoption())
                .statut(contract.getStatut())
                .conditionsGenerales(contract.getConditionsGenerales())
                .conditionsSpecifiques(contract.getConditionsSpecifiques())
                .fraisAdoption(contract.getFraisAdoption() != null ? contract.getFraisAdoption() : BigDecimal.ZERO)
                .documentUrl(contract.getDocumentUrl())
                .temoinNom(contract.getTemoinNom())
                .temoinEmail(contract.getTemoinEmail())
                .createdAt(contract.getCreatedAt())
                .updatedAt(contract.getUpdatedAt())
                .build();
    }
}