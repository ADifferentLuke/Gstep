package net.lukemcomber.rest;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

import net.lukemcomber.genetics.SteppableEcosystem;
import net.lukemcomber.model.responses.AdvanceWorldResponse;
import net.lukemcomber.service.SimulationService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;

@RestController
@RequestMapping("genetics")
public class TickClockEndpoint {

    @Autowired
    private SimulationService simulationService;

    @GetMapping("v1/tick/{id}")
    public ResponseEntity<AdvanceWorldResponse> tickTock(@PathVariable(name = "id") final String id,
                                                         @RequestParam(name = "ticks", required = false, defaultValue = "1") final Integer ticks) {

        final AdvanceWorldResponse response = new AdvanceWorldResponse();

        if (StringUtils.isNotEmpty(id)) {
            final SteppableEcosystem ecosystem = simulationService.get(id);
            if (Objects.nonNull(ecosystem)) {
                response.active = ecosystem.isActive();
                if (ecosystem.isActive()) {
                    for (int i = 0; i < ticks; ++i) {
                        if (!ecosystem.advance()) {
                            response.active = false;
                            break;
                        }
                    }
                    response.time = ecosystem.getTime();
                    response.setStatusCode(HttpStatus.OK);
                } else {
                    response.setMessage(String.format("Simulation %s is not interactive.", id));
                }
            } else {
                response.setMessage(String.format("Session $s not found.", id));
            }
        }
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

}
