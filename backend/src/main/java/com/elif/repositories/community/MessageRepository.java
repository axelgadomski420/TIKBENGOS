package com.elif.repositories.community;

import com.elif.entities.community.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdAndDeletedAtIsNullOrderByCreatedAtAsc(Long conversationId);

    long countByConversationIdAndSenderIdNotAndReadAtIsNull(Long conversationId, Long senderId);

    List<Message> findByConversationIdAndSenderIdNotAndReadAtIsNull(Long conversationId, Long senderId);

    Optional<Message> findTopByConversationIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long conversationId);

    Optional<Message> findTopByConversationIdOrderByCreatedAtDesc(Long conversationId);

    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    long countByConversationId(Long conversationId);

    long countByConversationIdAndDeletedAtIsNotNull(Long conversationId);
}
