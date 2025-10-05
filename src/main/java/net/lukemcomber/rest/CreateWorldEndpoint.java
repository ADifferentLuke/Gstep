package net.lukemcomber.rest;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

import net.lukemcomber.genetics.Ecosystem;
import net.lukemcomber.genetics.SteppableEcosystem;
import net.lukemcomber.genetics.model.SpatialCoordinates;
import net.lukemcomber.genetics.model.UniverseConstants;
import net.lukemcomber.genetics.model.ecosystem.impl.SteppableEcosystemConfiguration;
import net.lukemcomber.genetics.universes.CustomUniverse;
import net.lukemcomber.model.responses.CreateWorldResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import net.lukemcomber.model.requests.CreateWorldRequest;

@RestController
@RequestMapping("genetics")
public class CreateWorldEndpoint {

    public static final int TICKS_PER_DAY = 24;
    public static final String DEFAULT_NAME = "GstepSimulation";
    public static final SpatialCoordinates initialSize = new SpatialCoordinates(25, 25, 1);

    @PostMapping("v1.0/world")
    public ResponseEntity<CreateWorldResponse> createWorld(@RequestBody final CreateWorldRequest request) {

        final CreateWorldResponse response = new CreateWorldResponse();

        response.setStatusCode(HttpStatus.BAD_REQUEST);

        final UniverseConstants properties = new CustomUniverse(request.properties);
        Ecosystem newEcosystem;

        try {

            final SpatialCoordinates midPoint = new SpatialCoordinates(initialSize.xAxis() / 2, initialSize.yAxis() / 2, initialSize.zAxis());
            final Map<SpatialCoordinates, String> startingOrganisms = new HashMap<>();

            startingOrganisms.put(midPoint, request.dna);

            newEcosystem = new SteppableEcosystem(properties,
                    SteppableEcosystemConfiguration.builder()
                            .ticksPerTurn(1)
                            .ticksPerDay(TICKS_PER_DAY)
                            .size(initialSize)
                            .name(DEFAULT_NAME)
                            .startOrganisms(startingOrganisms)
                            .build());

            response.id = newEcosystem.getId();

            newEcosystem.initialize(() -> null);

            response.setStatusCode(HttpStatus.OK);

        } catch (final IOException e) {
            response.setMessage(e.getMessage());
        }
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

}
