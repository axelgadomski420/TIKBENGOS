package com.elif.controllers.service;

import com.elif.entities.service.ServiceOption;
import com.elif.services.service.ServiceOptionService;
import com.elif.exceptions.ResourceNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/service-options")
public class ServiceOptionController {

    private final ServiceOptionService serviceOptionService;

    public ServiceOptionController(ServiceOptionService serviceOptionService) {
        this.serviceOptionService = serviceOptionService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceOption>> getAll() {
        List<ServiceOption> options = serviceOptionService.getAll();
        return ResponseEntity.ok(options);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceOption> getById(@PathVariable Long id) {
        ServiceOption option = serviceOptionService.getById(id);
        return ResponseEntity.ok(option);
    }

    @PostMapping
    public ResponseEntity<ServiceOption> create(@RequestBody ServiceOption serviceOption) {
        ServiceOption created = serviceOptionService.create(serviceOption);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceOption> update(@PathVariable Long id, @RequestBody ServiceOption serviceOption) {
        ServiceOption updated = serviceOptionService.update(id, serviceOption);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceOptionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-service/{serviceId}")
    public ResponseEntity<List<ServiceOption>> findByServiceId(@PathVariable Long serviceId) {
        List<ServiceOption> options = serviceOptionService.findByServiceId(serviceId);
        return ResponseEntity.ok(options);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleResourceNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }
}
