package net.lukemcomber.model;

/*
 * (c) 2023 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CellLocation {

    @JsonProperty("x")
    public long x;
    @JsonProperty("y")
    public long y;
    @JsonProperty("z")
    public long z;
    @JsonProperty("type")
    public String type;

    public CellLocation() {
        x = 0;
        y = 0;
        z = 0;
        type = "unknown";
    }
    public CellLocation(final long x, final long y, final long z, final String type ){
       this.x = x;
       this.y = y;
       this.z = z;
       this.type = type;
    }
}
