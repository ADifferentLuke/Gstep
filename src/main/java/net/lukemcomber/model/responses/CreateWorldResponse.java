package net.lukemcomber.model.responses;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */


import com.fasterxml.jackson.annotation.JsonProperty;
import net.lukemcomber.model.BasicResponse;

public class CreateWorldResponse extends BasicResponse {

    @JsonProperty("id")
    public String id;

}
