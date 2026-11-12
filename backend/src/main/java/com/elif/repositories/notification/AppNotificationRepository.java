package com.elif.repositories.notification;

import com.elif.entities.notification.AppNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {

    Page<AppNotification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<AppNotification> findByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Optional<AppNotification> findByIdAndUserId(Long id, Long userId);

    long countByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("update AppNotification n set n.read = true where n.userId = :userId and n.read = false")
    int markAllReadByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("delete from AppNotification n where n.userId = :userId")
    int clearAllByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("delete from AppNotification n where n.id = :notificationId and n.userId = :userId")
    int clearByIdAndUserId(@Param("notificationId") Long notificationId, @Param("userId") Long userId);
}
