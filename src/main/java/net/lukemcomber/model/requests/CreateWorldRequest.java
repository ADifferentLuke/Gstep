package net.lukemcomber.model.requests;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateWorldRequest {

    @JsonProperty("organism")
    public String dna;

    @JsonProperty("properties")
    public Map<String,Object> properties;
}
