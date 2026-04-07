package com.globalhandlooms.model;

import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackingEvent {
    private String status;
    private String location;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
