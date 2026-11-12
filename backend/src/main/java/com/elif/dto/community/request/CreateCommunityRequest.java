package com.elif.dto.community.request;

import com.elif.entities.community.enums.CommunityType;
import lombok.Data;

@Data
public class CreateCommunityRequest {
    private String name;
    private String description;
    private CommunityType type = CommunityType.PUBLIC;
    private String bannerUrl;
    private String iconUrl;
}
