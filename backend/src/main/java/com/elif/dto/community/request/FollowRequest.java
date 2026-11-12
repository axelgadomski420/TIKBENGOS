package com.elif.dto.community.request;

import com.elif.entities.community.enums.FollowType;
import lombok.Data;

@Data
public class FollowRequest {
    private Long followeeId;
    private FollowType followType;
}
