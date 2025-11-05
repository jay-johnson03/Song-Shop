package com.songshop.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/api/spotify")
public class SpotifyController {

    @GetMapping("/token")
    public String token() {
        try {
            return SpotifyAuth.getAccessToken();
        } catch (IOException e) {
            e.printStackTrace();
            return "";
        }
    }
}
