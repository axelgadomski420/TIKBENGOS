package com.elif.controllers.service;

import com.elif.entities.service.ServiceCategory;
import com.elif.services.service.ServiceCategoryService;
import com.elif.exceptions.ResourceNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/service-categories")
public class ServiceCategoryController {

    private final ServiceCategoryService serviceCategoryService;

    public ServiceCategoryController(ServiceCategoryService serviceCategoryService) {
        this.serviceCategoryService = serviceCategoryService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceCategory>> getAll() {
        List<ServiceCategory> categories = serviceCategoryService.getAll();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceCategory> getById(@PathVariable Long id) {
        ServiceCategory category = serviceCategoryService.getById(id);
        return ResponseEntity.ok(category);
    }

    @PostMapping
    public ResponseEntity<ServiceCategory> create(@RequestBody ServiceCategory serviceCategory) {
        ServiceCategory created = serviceCategoryService.create(serviceCategory);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceCategory> update(@PathVariable Long id, @RequestBody ServiceCategory serviceCategory) {
        ServiceCategory updated = serviceCategoryService.update(id, serviceCategory);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceCategoryService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-name/{name}")
    public ResponseEntity<ServiceCategory> getByName(@PathVariable String name) {
        ServiceCategory category = serviceCategoryService.getByName(name);
        return ResponseEntity.ok(category);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleResourceNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }
}
