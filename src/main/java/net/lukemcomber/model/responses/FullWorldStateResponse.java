package net.lukemcomber.model.responses;

/*
 * (c) 2023 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */


import com.fasterxml.jackson.annotation.JsonProperty;
import net.lukemcomber.model.BasicResponse;
import net.lukemcomber.model.CellLocation;

import java.util.LinkedList;
import java.util.List;

public class FullWorldStateResponse extends BasicResponse {

    @JsonProperty("totalTicks")
    public long totalTicks;
    @JsonProperty("totalDays")
    public long totalDays;
    @JsonProperty("currentTick")
    public long currentTick;

    @JsonProperty("active")
    public boolean active;

    @JsonProperty("width")
    public int eidth;

    @JsonProperty("height")
    public int height;

    @JsonProperty("cells")
    public List<CellLocation> organismBodies = new LinkedList<>();

}
