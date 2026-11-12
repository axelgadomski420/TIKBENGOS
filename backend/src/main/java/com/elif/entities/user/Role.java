package com.elif.entities.user;

public enum Role {
    USER,        // default — any registered person, can own pets, adopt, buy etc.
    VET,
    SHELTER,// has professional credentials, verified by admin
    SERVICE_PROVIDER, // groomer, trainer, boarder etc., verified by admin
    ADMIN        // platform administrator
}
