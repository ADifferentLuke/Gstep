package net.lukemcomber.rest;

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SpaForwardController implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Forward the client-side route "/canvas" to index.html so the SPA can handle it.
        registry.addViewController("/canvas").setViewName("forward:/index.html");
    }
}