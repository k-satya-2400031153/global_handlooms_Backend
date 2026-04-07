package com.globalhandlooms.service;

import com.globalhandlooms.model.Order;
import com.globalhandlooms.model.TrackingEvent;
import com.globalhandlooms.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogisticsEngineService {

    private final OrderRepository orderRepository;
    private final Random random = new Random();

    // Pipeline stages matching Node.js exactly
    private static final List<String> PIPELINE = List.of(
        "Pending", "Processing", "Shipped", "Out for Delivery", "Delivered"
    );

    // Time-gate in milliseconds before advancing each stage
    private static final Map<String, Long> STAGE_GATE_MS = Map.of(
        "Pending",          2L  * 60 * 60 * 1000,
        "Processing",       6L  * 60 * 60 * 1000,
        "Shipped",          10L * 60 * 60 * 1000,
        "Out for Delivery", 6L  * 60 * 60 * 1000
    );

    private static final Map<String, List<String>> LOCATIONS = Map.of(
        "Processing",       List.of("Artisan Hub, Varanasi", "Artisan Hub, Bhuj", "Artisan Hub, Jaipur"),
        "Shipped",          List.of("In Transit - NH16 Highway", "Regional Logistics Center, Hyderabad", "Cross-State Transit Hub, Nagpur"),
        "Out for Delivery", List.of("Local Destination Courier", "Final Mile Delivery Hub"),
        "Delivered",        List.of("Delivered to Customer")
    );

    @Scheduled(fixedRate = 600_000) // every 10 minutes
    public void tick() {
        try {
            List<Order> activeOrders = orderRepository.findAllByAutoFulfillmentTrueAndStatusNotIn(
                List.of("Delivered", "Cancelled")
            );
            if (activeOrders.isEmpty()) return;

            long now = System.currentTimeMillis();

            for (Order order : activeOrders) {
                Long gateMs = STAGE_GATE_MS.get(order.getStatus());
                if (gateMs == null) continue;

                // Find when current status was last set from tracking history
                Instant statusSetAt = order.getTrackingHistory().stream()
                    .filter(h -> order.getStatus().equals(h.getStatus()))
                    .map(TrackingEvent::getTimestamp)
                    .reduce((a, b) -> b) // last one
                    .orElse(order.getUpdatedAt() != null ? order.getUpdatedAt() : order.getCreatedAt());

                if (statusSetAt == null) continue;
                long elapsed = now - statusSetAt.toEpochMilli();
                if (elapsed < gateMs) continue;

                // Advance to next stage
                int idx = PIPELINE.indexOf(order.getStatus());
                if (idx < 0 || idx >= PIPELINE.size() - 1) continue;

                String nextStatus = PIPELINE.get(idx + 1);
                List<String> locs = LOCATIONS.getOrDefault(nextStatus, List.of("System Checkpoint"));
                String location = locs.get(random.nextInt(locs.size()));

                order.setStatus(nextStatus);
                order.getTrackingHistory().add(TrackingEvent.builder()
                    .status(nextStatus).location(location).timestamp(Instant.now()).build());

                if ("Shipped".equals(nextStatus) && order.getTrackingNumber() == null) {
                    order.setTrackingNumber("GH" + Long.toString(System.currentTimeMillis(), 36).toUpperCase());
                }
                order.setUpdatedAt(Instant.now());
                orderRepository.save(order);

                log.info("[Logistics] Order ...{} advanced: {} -> {} ({})",
                    order.getId().length() > 4 ? order.getId().substring(order.getId().length() - 4) : order.getId(),
                    PIPELINE.get(idx), nextStatus, location);
            }
        } catch (Exception e) {
            log.error("[Logistics Engine] Error: {}", e.getMessage());
        }
    }
}
