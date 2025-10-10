package net.lukemcomber.model;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class CellInformation {

    @JsonProperty("type")
    public String type;

    @JsonProperty("totalEnergyCollected")
    public int totalEnergyCollected;

    @JsonProperty("totalEnergyMetabolized")
    public int totalEnergyMetabolized;

    @JsonProperty("genes")
    public List<String> genes;

    @JsonProperty("organism")
    public OrganismInformation organism;


}
