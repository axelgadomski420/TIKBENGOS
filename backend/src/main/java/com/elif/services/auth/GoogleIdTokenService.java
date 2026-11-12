package com.elif.services.auth;

import com.elif.dto.user.GoogleUserPrincipal;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.Optional;

@Slf4j
@Service
public class GoogleIdTokenService {

    private final String clientId;

    public GoogleIdTokenService(@Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId;
    }

    public Optional<GoogleUserPrincipal> verify(String idTokenString) {
        if (!StringUtils.hasText(clientId)) {
            log.warn("Google Sign-In is disabled: app.google.client-id is not set");
            throw new IllegalStateException("Google Sign-In is not configured on the server");
        }
        if (!StringUtils.hasText(idTokenString)) {
            return Optional.empty();
        }
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            ).setAudience(Collections.singletonList(clientId)).build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                return Optional.empty();
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            if (!StringUtils.hasText(email)) {
                return Optional.empty();
            }
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
            String sub = payload.getSubject();
            String given = (String) payload.get("given_name");
            String family = (String) payload.get("family_name");
            return Optional.of(new GoogleUserPrincipal(sub, email, emailVerified, given, family));
        } catch (Exception e) {
            log.warn("Failed to verify Google ID token: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
