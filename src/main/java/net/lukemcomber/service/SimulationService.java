package net.lukemcomber.service;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */



import net.lukemcomber.genetics.SteppableEcosystem;
import net.lukemcomber.genetics.model.SpatialCoordinates;
import net.lukemcomber.genetics.model.UniverseConstants;
import net.lukemcomber.genetics.model.ecosystem.impl.SteppableEcosystemConfiguration;
import net.lukemcomber.genetics.universes.CustomUniverse;
import net.lukemcomber.model.requests.CreateWorldRequest;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SimulationService {

    public static final SpatialCoordinates initialSize = new SpatialCoordinates(25, 25, 1);

    public static final int TICKS_PER_DAY = 24;
    public static final String DEFAULT_NAME = "GstepSimulation";


    private final static ConcurrentHashMap<String, SteppableEcosystem> ecosystems = new ConcurrentHashMap<>();

    public String create(final CreateWorldRequest request) throws IOException {

        final UniverseConstants properties = new CustomUniverse(request.properties);

        final SpatialCoordinates midPoint = new SpatialCoordinates(initialSize.xAxis() / 2, initialSize.yAxis() / 2, initialSize.zAxis());
        final Map<SpatialCoordinates, String> startingOrganisms = new HashMap<>();

        startingOrganisms.put(midPoint, request.dna);


        final SteppableEcosystem ecosystem = new SteppableEcosystem(properties,
                SteppableEcosystemConfiguration.builder()
                        .ticksPerTurn(1)
                        .ticksPerDay(TICKS_PER_DAY)
                        .size(initialSize)
                        .name(DEFAULT_NAME)
                        .startOrganisms(startingOrganisms)
                        .build());

        ecosystems.put(ecosystem.getId(), ecosystem);

        ecosystem.initialize(() -> null);

        return ecosystem.getId();
    }

    public SteppableEcosystem get(final String id) {
        return ecosystems.get(id);
    }

}
