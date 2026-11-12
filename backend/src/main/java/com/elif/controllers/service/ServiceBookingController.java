package com.elif.controllers.service;

import com.elif.dto.service.ServiceBookingDTO;
import com.elif.entities.service.ServiceBooking;
import com.elif.services.service.ServiceBookingService;
import com.elif.exceptions.ResourceNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/service-bookings")
public class ServiceBookingController {

    private final ServiceBookingService serviceBookingService;

    public ServiceBookingController(ServiceBookingService serviceBookingService) {
        this.serviceBookingService = serviceBookingService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceBooking>> getAll() {
        List<ServiceBooking> bookings = serviceBookingService.getAll();
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceBooking> getById(@PathVariable Long id) {
        ServiceBooking booking = serviceBookingService.getById(id);
        return ResponseEntity.ok(booking);
    }

    @PostMapping
    public ResponseEntity<ServiceBooking> create(@RequestBody ServiceBookingDTO dto) {
        ServiceBooking created = serviceBookingService.create(dto);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceBooking> update(@PathVariable Long id, @RequestBody ServiceBookingDTO dto) {
        ServiceBooking updated = serviceBookingService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceBookingService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<List<ServiceBooking>> findByUserId(@PathVariable Long userId) {
        List<ServiceBooking> bookings = serviceBookingService.findByUserId(userId);
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/by-service/{serviceId}")
    public ResponseEntity<List<ServiceBooking>> findByServiceId(@PathVariable Long serviceId) {
        List<ServiceBooking> bookings = serviceBookingService.findByServiceId(serviceId);
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/by-status/{status}")
    public ResponseEntity<List<ServiceBooking>> findByStatus(@PathVariable String status) {
        List<ServiceBooking> bookings = serviceBookingService.findByStatus(status);
        return ResponseEntity.ok(bookings);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ServiceBooking> approveBooking(@PathVariable Long id, @RequestParam boolean accept) {
        ServiceBooking approved = serviceBookingService.approveBooking(id, accept);
        return ResponseEntity.ok(approved);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleResourceNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }
}
