package net.lukemcomber.model.responses;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import net.lukemcomber.model.BasicResponse;
import net.lukemcomber.model.CellInformation;

import java.util.HashMap;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class InspectCellResponse extends BasicResponse {

    @JsonProperty("terrain")
    public Map<String,String> terrain = new HashMap<>();

    @JsonProperty("cell")
    public CellInformation cellInformation;
}
