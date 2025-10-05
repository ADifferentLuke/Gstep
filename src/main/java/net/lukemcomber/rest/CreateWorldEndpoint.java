package net.lukemcomber.rest;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

import net.lukemcomber.model.responses.CreateWorldResponse;
import net.lukemcomber.service.SimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

import net.lukemcomber.model.requests.CreateWorldRequest;

@RestController
@RequestMapping("genetics")
public class CreateWorldEndpoint {

    @Autowired
    private SimulationService simulationService;

    @PostMapping("v1.0/world")
    public ResponseEntity<CreateWorldResponse> createWorld(@RequestBody final CreateWorldRequest request) {

        final CreateWorldResponse response = new CreateWorldResponse();

        response.setStatusCode(HttpStatus.BAD_REQUEST);

        try {
            response.id = simulationService.create(request);

            response.setStatusCode(HttpStatus.OK);

        } catch (final IOException e) {
            response.setMessage(e.getMessage());
        }
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

}
