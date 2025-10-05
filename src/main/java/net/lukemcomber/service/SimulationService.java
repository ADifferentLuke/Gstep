package net.lukemcomber.service;

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
import java.util.Objects;

@Service
public class SimulationService {

    public static final SpatialCoordinates initialSize = new SpatialCoordinates(25, 25, 1);

    public static final int TICKS_PER_DAY = 24;
    public static final String DEFAULT_NAME = "GstepSimulation";


    private static final Object Lock = new Object();
    private static SteppableEcosystem ecosystem = null;

    public String create(final CreateWorldRequest request) throws IOException {

        final UniverseConstants properties = new CustomUniverse(request.properties);

        final SpatialCoordinates midPoint = new SpatialCoordinates(initialSize.xAxis() / 2, initialSize.yAxis() / 2, initialSize.zAxis());
        final Map<SpatialCoordinates, String> startingOrganisms = new HashMap<>();

        startingOrganisms.put(midPoint, request.dna);

        synchronized (Lock) {

            if (Objects.isNull(ecosystem)) {
                ecosystem = new SteppableEcosystem(properties,
                        SteppableEcosystemConfiguration.builder()
                                .ticksPerTurn(1)
                                .ticksPerDay(TICKS_PER_DAY)
                                .size(initialSize)
                                .name(DEFAULT_NAME)
                                .startOrganisms(startingOrganisms)
                                .build());

                ecosystem.initialize(() -> null);
            }
        }
        return ecosystem.getId();
    }

}
