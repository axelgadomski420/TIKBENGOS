package com.elif.repositories.community;

import com.elif.entities.community.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

        Optional<Conversation> findByParticipantOneIdAndParticipantTwoId(Long participantOneId, Long participantTwoId);

        List<Conversation> findByParticipantOneIdOrParticipantTwoIdOrderByLastMessageAtDesc(Long participantOneId,
                        Long participantTwoId);

        List<Conversation> findAllByOrderByLastMessageAtDesc();
}
