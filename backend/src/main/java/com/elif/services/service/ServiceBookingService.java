package com.elif.services.service;

import com.elif.dto.service.ServiceBookingDTO;
import com.elif.entities.service.Service;
import com.elif.entities.service.ServiceAvailability;
import com.elif.entities.service.ServiceBooking;
import com.elif.entities.service.ServiceOption;
import com.elif.entities.user.User;
import com.elif.exceptions.ResourceNotFoundException;
import com.elif.repositories.service.ServiceAvailabilityRepository;
import com.elif.repositories.service.ServiceBookingRepository;
import com.elif.repositories.service.ServiceOptionRepository;
import com.elif.repositories.service.ServiceRepository;
import com.elif.repositories.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
public class ServiceBookingService {

    private final ServiceBookingRepository serviceBookingRepository;
    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;
    private final ServiceAvailabilityRepository serviceAvailabilityRepository;
    private final ServiceOptionRepository serviceOptionRepository;

    public ServiceBookingService(ServiceBookingRepository serviceBookingRepository,
                                 ServiceRepository serviceRepository,
                                 UserRepository userRepository,
                                 ServiceAvailabilityRepository serviceAvailabilityRepository,
                                 ServiceOptionRepository serviceOptionRepository) {
        this.serviceBookingRepository = serviceBookingRepository;
        this.serviceRepository = serviceRepository;
        this.userRepository = userRepository;
        this.serviceAvailabilityRepository = serviceAvailabilityRepository;
        this.serviceOptionRepository = serviceOptionRepository;
    }

    public List<ServiceBooking> getAll() {
        return serviceBookingRepository.findAll();
    }

    public ServiceBooking getById(Long id) {
        return serviceBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceBooking not found with id: " + id));
    }

    public ServiceBooking create(ServiceBooking serviceBooking) {
        return serviceBookingRepository.save(serviceBooking);
    }

    public ServiceBooking create(ServiceBookingDTO dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getUserId()));
        Service service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service not found with id: " + dto.getServiceId()));
        ServiceAvailability availability = serviceAvailabilityRepository.findById(dto.getAvailabilityId())
                .orElseThrow(() -> new ResourceNotFoundException("ServiceAvailability not found with id: " + dto.getAvailabilityId()));

        Set<ServiceOption> selectedOptions = Set.of();
        if (dto.getSelectedOptionIds() != null && !dto.getSelectedOptionIds().isEmpty()) {
            selectedOptions = dto.getSelectedOptionIds().stream()
                    .map(id -> serviceOptionRepository.findById(id)
                            .orElseThrow(() -> new ResourceNotFoundException("ServiceOption not found with id: " + id)))
                    .collect(Collectors.toSet());
        }

        // Calcul du prix total : prix du service + somme des prix des options
        double totalPrice = service.getPrice();
        if (!selectedOptions.isEmpty()) {
            totalPrice += selectedOptions.stream()
                    .mapToDouble(ServiceOption::getPrice)
                    .sum();
        }

        ServiceBooking serviceBooking = new ServiceBooking();
        serviceBooking.setUser(user);
        serviceBooking.setPetName(dto.getPetName());
        serviceBooking.setPetType(dto.getPetType());
        serviceBooking.setPetBreed(dto.getPetBreed());
        serviceBooking.setPetAge(dto.getPetAge() != null ? dto.getPetAge() : 0);
        serviceBooking.setService(service);
        serviceBooking.setSelectedOptions(selectedOptions);
        serviceBooking.setAvailability(availability);
        serviceBooking.setBookingDate(dto.getBookingDate() != null ? dto.getBookingDate() : LocalDateTime.now());
        serviceBooking.setStatus("PENDING");
        serviceBooking.setTotalPrice(totalPrice);

        return serviceBookingRepository.save(serviceBooking);
    }

    public ServiceBooking update(Long id, ServiceBooking serviceBooking) {
        ServiceBooking existing = getById(id);
        if (serviceBooking.getUser() != null) {
            existing.setUser(serviceBooking.getUser());
        }
        if (serviceBooking.getPetName() != null) {
            existing.setPetName(serviceBooking.getPetName());
        }
        if (serviceBooking.getPetType() != null) {
            existing.setPetType(serviceBooking.getPetType());
        }
        if (serviceBooking.getPetBreed() != null) {
            existing.setPetBreed(serviceBooking.getPetBreed());
        }
        if (serviceBooking.getPetAge() > 0) {
            existing.setPetAge(serviceBooking.getPetAge());
        }
        if (serviceBooking.getService() != null) {
            existing.setService(serviceBooking.getService());
        }
        if (serviceBooking.getSelectedOptions() != null) {
            existing.setSelectedOptions(serviceBooking.getSelectedOptions());
        }
        if (serviceBooking.getAvailability() != null) {
            existing.setAvailability(serviceBooking.getAvailability());
        }
        if (serviceBooking.getBookingDate() != null) {
            existing.setBookingDate(serviceBooking.getBookingDate());
        }
        if (serviceBooking.getStatus() != null) {
            existing.setStatus(serviceBooking.getStatus());
        }
        return serviceBookingRepository.save(existing);
    }

    public ServiceBooking update(Long id, ServiceBookingDTO dto) {
        ServiceBooking existing = getById(id);

        if (dto.getUserId() != null) {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getUserId()));
            existing.setUser(user);
        }
        if (dto.getPetName() != null) {
            existing.setPetName(dto.getPetName());
        }
        if (dto.getPetType() != null) {
            existing.setPetType(dto.getPetType());
        }
        if (dto.getPetBreed() != null) {
            existing.setPetBreed(dto.getPetBreed());
        }
        if (dto.getPetAge() != null) {
            existing.setPetAge(dto.getPetAge());
        }
        if (dto.getServiceId() != null) {
            Service service = serviceRepository.findById(dto.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service not found with id: " + dto.getServiceId()));
            existing.setService(service);
        }
        if (dto.getSelectedOptionIds() != null) {
            Set<ServiceOption> selectedOptions = dto.getSelectedOptionIds().stream()
                    .map(optId -> serviceOptionRepository.findById(optId)
                            .orElseThrow(() -> new ResourceNotFoundException("ServiceOption not found with id: " + optId)))
                    .collect(Collectors.toSet());
            existing.setSelectedOptions(selectedOptions);
        }
        if (dto.getAvailabilityId() != null) {
            ServiceAvailability availability = serviceAvailabilityRepository.findById(dto.getAvailabilityId())
                    .orElseThrow(() -> new ResourceNotFoundException("ServiceAvailability not found with id: " + dto.getAvailabilityId()));
            existing.setAvailability(availability);
        }
        if (dto.getBookingDate() != null) {
            existing.setBookingDate(dto.getBookingDate());
        }
        if (dto.getStatus() != null) {
            existing.setStatus(dto.getStatus());
        }

        return serviceBookingRepository.save(existing);
    }

    public void delete(Long id) {
        ServiceBooking serviceBooking = getById(id);
        serviceBookingRepository.delete(serviceBooking);
    }

    public List<ServiceBooking> findByUserId(Long userId) {
        return serviceBookingRepository.findByUserId(userId);
    }

    public List<ServiceBooking> findByServiceId(Long serviceId) {
        return serviceBookingRepository.findByServiceId(serviceId);
    }

    public List<ServiceBooking> findByStatus(String status) {
        return serviceBookingRepository.findByStatus(status);
    }

    public ServiceBooking approveBooking(Long bookingId, boolean accept) {
        ServiceBooking booking = getById(bookingId);
        if (accept) {
            booking.setStatus("ACCEPTED");
        } else {
            booking.setStatus("REJECTED");
        }
        return serviceBookingRepository.save(booking);
    }
}
