package net.lukemcomber.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CellInformation {

    @JsonProperty("type")
    public String type;

    @JsonProperty("totalEnergyCollected")
    public int totalEnergyCollected;

    @JsonProperty("totalEnergyMetabolized")
    public int totalEnergyMetabolized;

}
