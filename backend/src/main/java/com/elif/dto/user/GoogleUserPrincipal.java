package com.elif.dto.user;

public record GoogleUserPrincipal(
        String sub,
        String email,
        boolean emailVerified,
        String givenName,
        String familyName
) {}
