package net.lukemcomber.model;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

import com.fasterxml.jackson.annotation.JsonProperty;

public class OrganismInformation {


    @JsonProperty("metabolismCost")
    public int metabolismCost;

    @JsonProperty("currentEnergy")
    public int currentEnergy;

    @JsonProperty("type")
    public String type;

    @JsonProperty("cellCount")
    public int cellCount;

    @JsonProperty("totalEnergyCollected")
    public int totalEnergyCollected;

    @JsonProperty("totalEnergyMetabolized")
    public int totalEnergyMetabolizzd;
}
