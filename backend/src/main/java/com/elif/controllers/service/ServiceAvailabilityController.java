package com.elif.controllers.service;

import com.elif.dto.service.ServiceAvailabilityDTO;
import com.elif.entities.service.ServiceAvailability;
import com.elif.services.service.ServiceAvailabilityService;
import com.elif.exceptions.ResourceNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/service-availability")
public class ServiceAvailabilityController {

    private final ServiceAvailabilityService serviceAvailabilityService;

    public ServiceAvailabilityController(ServiceAvailabilityService serviceAvailabilityService) {
        this.serviceAvailabilityService = serviceAvailabilityService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceAvailability>> getAll() {
        List<ServiceAvailability> availabilities = serviceAvailabilityService.getAll();
        return ResponseEntity.ok(availabilities);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceAvailability> getById(@PathVariable Long id) {
        ServiceAvailability availability = serviceAvailabilityService.getById(id);
        return ResponseEntity.ok(availability);
    }

    @PostMapping
    public ResponseEntity<ServiceAvailability> create(@RequestBody ServiceAvailabilityDTO dto) {
        ServiceAvailability created = serviceAvailabilityService.create(dto);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceAvailability> update(@PathVariable Long id, @RequestBody ServiceAvailabilityDTO dto) {
        ServiceAvailability updated = serviceAvailabilityService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceAvailabilityService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-service/{serviceId}")
    public ResponseEntity<List<ServiceAvailability>> findByServiceId(@PathVariable Long serviceId) {
        List<ServiceAvailability> availabilities = serviceAvailabilityService.findByServiceId(serviceId);
        return ResponseEntity.ok(availabilities);
    }

    @GetMapping("/available")
    public ResponseEntity<List<ServiceAvailability>> findByAvailableTrue() {
        List<ServiceAvailability> availabilities = serviceAvailabilityService.findByAvailableTrue();
        return ResponseEntity.ok(availabilities);
    }

    @GetMapping("/by-date")
    public ResponseEntity<List<ServiceAvailability>> findByDate(@RequestParam LocalDate date) {
        List<ServiceAvailability> availabilities = serviceAvailabilityService.findByDate(date);
        return ResponseEntity.ok(availabilities);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleResourceNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }
}
