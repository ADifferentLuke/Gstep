package net.lukemcomber.rest;

import net.lukemcomber.model.requests.CreateWorldRequest;
import net.lukemcomber.model.responses.CreateWorldResponse;
import net.lukemcomber.service.SimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("genetics")
public class GetWorldStateEndpoint {

    @Autowired
    private SimulationService simulationService;

    @GetMapping("v1.0/state/{id}")
    public ResponseEntity<CreateWorldResponse> getState(@PathVariable String id) {

        return null;

    }
}
