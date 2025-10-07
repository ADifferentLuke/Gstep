package net.lukemcomber.rest;

import net.lukemcomber.genetics.SteppableEcosystem;
import net.lukemcomber.genetics.biology.Cell;
import net.lukemcomber.genetics.biology.Organism;
import net.lukemcomber.genetics.model.SpatialCoordinates;
import net.lukemcomber.genetics.world.terrain.Terrain;
import net.lukemcomber.genetics.world.terrain.TerrainProperty;
import net.lukemcomber.model.CellInformation;
import net.lukemcomber.model.responses.FullWorldStateResponse;
import net.lukemcomber.model.responses.InspectCellResponse;
import net.lukemcomber.service.SimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("genetics")
public class InspectCellEndpoint {

    @Autowired
    private SimulationService simulationService;


    @GetMapping("v1/inspect/{id}")
    public ResponseEntity<InspectCellResponse> inspect(@PathVariable String id,
                                                       @RequestParam(name = "x") final Integer xCoord,
                                                       @RequestParam(name = "y") final Integer yCoord) {

        final InspectCellResponse response = new InspectCellResponse();
        final SteppableEcosystem ecosystem = simulationService.get(id);

        if (Objects.nonNull(ecosystem)) {

            final SpatialCoordinates worldSize = ecosystem.getWorldSize();
            final boolean xValid = 0 <= xCoord && worldSize.xAxis() > xCoord;
            final boolean yValid = 0 <= yCoord && worldSize.yAxis() > yCoord;

            // TODO verify zAxis doesnt matter
            final SpatialCoordinates coordinates = new SpatialCoordinates(xCoord,yCoord,0);

            if (xValid && yValid) {

                final Terrain terrain = ecosystem.getTerrain();;
                final List<TerrainProperty> terrainPropertyList = terrain.getTerrainProperties(coordinates);
                response.terrain = terrainPropertyList.stream()
                        .collect(Collectors.toMap(TerrainProperty::getId, t -> String.valueOf(t.getValue()) ));

                if( terrain.hasCell(coordinates)){

                    final Cell cell = terrain.getCell(coordinates);
                    final Organism organism = terrain.getOrganism(coordinates);
                    final CellInformation information = new CellInformation();

                    information.type = cell.getCellType();
                    information.totalEnergyCollected = cell.getTotalEnergyGenerated();
                    information.totalEnergyMetabolized = cell.getTotalEnergySpent();

                    response.cellInformation = information;

                }

                response.setStatusCode(HttpStatus.OK);
            } else {
                response.setMessage("Coordinate (%d,%d) out of (%d,%d) bounds.".formatted(
                        xCoord, yCoord,
                        worldSize.xAxis(), worldSize.yAxis()));

                response.setStatusCode(HttpStatus.NOT_FOUND);

            }

        } else {
            response.setMessage("%s not found.".formatted(id));
            response.setStatusCode(HttpStatus.NOT_FOUND);
        }
        return ResponseEntity.status(response.getStatusCode()).body(response);

    }
}
