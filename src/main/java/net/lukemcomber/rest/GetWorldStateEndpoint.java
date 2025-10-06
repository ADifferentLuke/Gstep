package net.lukemcomber.rest;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */



import net.lukemcomber.genetics.SteppableEcosystem;
import net.lukemcomber.genetics.biology.Cell;
import net.lukemcomber.genetics.biology.Organism;
import net.lukemcomber.genetics.io.CellHelper;
import net.lukemcomber.genetics.model.TemporalCoordinates;
import net.lukemcomber.model.CellLocation;
import net.lukemcomber.model.responses.FullWorldStateResponse;
import net.lukemcomber.service.SimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Iterator;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("genetics")
public class GetWorldStateEndpoint {

    @Autowired
    private SimulationService simulationService;

    @GetMapping("v1/state/{id}")
    public ResponseEntity<FullWorldStateResponse> getState(@PathVariable String id) {

        final FullWorldStateResponse response = new FullWorldStateResponse();

        final SteppableEcosystem ecosystem = simulationService.get(id);
        if(Objects.isNull(ecosystem)){
            return ResponseEntity.notFound().build();
        } else {
            final TemporalCoordinates currentTime = ecosystem.getTime();

            response.currentTick = currentTime.currentTick();
            response.totalDays = currentTime.totalDays();
            response.totalTicks = currentTime.totalTicks();

            response.eidth = ecosystem.getWorldSize().xAxis();
            response.height = ecosystem.getWorldSize().yAxis();

            final Iterator<Organism> iterator = ecosystem.getTerrain().getOrganisms();
            while(iterator.hasNext()){
                final Organism organism = iterator.next();;
                final List<Cell> cells = CellHelper.getAllOrganismsCells(organism.getFirstCell());
                for( final Cell cell : cells ){
                    final CellLocation location = new CellLocation();

                    location.x = cell.getCoordinates().xAxis();
                    location.y = cell.getCoordinates().yAxis();
                    location.z = cell.getCoordinates().zAxis();

                    location.type = cell.getCellType();

                    response.organismBodies.add(location);
                }
            }

        }
        return ResponseEntity.ok().body(response);

    }
}
