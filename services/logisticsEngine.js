import Order from '../models/Order.js';

const STATUS_PIPELINE = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

// Minimum time (in ms) that must pass before advancing to the next stage
// Total minimum delivery time: 2h + 6h + 10h + 6h = 24 hours
const STAGE_GATE_MS = {
    'Pending':           2  * 60 * 60 * 1000,  // → Processing  after 2h  (order verified & packed)
    'Processing':        6  * 60 * 60 * 1000,  // → Shipped      after 6h  (dispatched from artisan hub)
    'Shipped':           10 * 60 * 60 * 1000,  // → Out for Delivery after 10h (in transit)
    'Out for Delivery':  6  * 60 * 60 * 1000,  // → Delivered    after 6h  (last mile delivery)
};

const STAGE_LOCATIONS = {
    'Processing':        ['Artisan Hub, Varanasi', 'Artisan Hub, Bhuj', 'Artisan Hub, Jaipur'],
    'Shipped':           ['In Transit - NH16 Highway', 'Regional Logistics Center, Hyderabad', 'Cross-State Transit Hub, Nagpur'],
    'Out for Delivery':  ['Local Destination Courier', 'Final Mile Delivery Hub'],
    'Delivered':         ['Delivered to Customer'],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const startLogisticsEngine = () => {
    console.log('🚛 Automated Mock Logistics Engine Online.');
    console.log('   ⏱  Stage gates: Pending(2h) → Processing(6h) → Shipped(10h) → Out for Delivery(6h) → Delivered');
    console.log('   📦 Minimum delivery time: 24 hours.');

    // Check every 10 minutes if any orders are ready to advance
    setInterval(async () => {
        try {
            const now = Date.now();

            const activeOrders = await Order.find({
                autoFulfillment: true,
                status: { $nin: ['Delivered', 'Cancelled'] }
            });

            if (activeOrders.length === 0) return;

            for (const order of activeOrders) {
                const gateMs = STAGE_GATE_MS[order.status];
                if (!gateMs) continue;

                // Find when this status was last set by looking at trackingHistory
                // Fall back to updatedAt if no history entry for this status
                const historyEntry = [...order.trackingHistory]
                    .reverse()
                    .find(h => h.status === order.status);
                const statusSetAt = historyEntry ? historyEntry.timestamp : order.updatedAt;

                const elapsedMs = now - new Date(statusSetAt).getTime();

                if (elapsedMs < gateMs) {
                    const remainingH = ((gateMs - elapsedMs) / 3600000).toFixed(1);
                    // Only log once every 6 checks to avoid log spam
                    if (Math.random() < 0.1) {
                        console.log(`[Logistics] Order …${order._id.toString().slice(-4)}: ${order.status} — ${remainingH}h until next stage`);
                    }
                    continue;
                }

                // Time gate passed — advance to next stage
                const currentIdx = STATUS_PIPELINE.indexOf(order.status);
                if (currentIdx < 0 || currentIdx >= STATUS_PIPELINE.length - 1) continue;

                const nextStatus = STATUS_PIPELINE[currentIdx + 1];
                const location   = pick(STAGE_LOCATIONS[nextStatus] || ['System Checkpoint']);

                order.status = nextStatus;
                order.trackingHistory.push({ status: nextStatus, location, timestamp: new Date() });

                if (nextStatus === 'Shipped' && !order.trackingNumber) {
                    order.trackingNumber = 'GH' + Math.random().toString(36).slice(2, 12).toUpperCase();
                }

                await order.save();
                console.log(`[Logistics] ✅ Order …${order._id.toString().slice(-4)} advanced: ${STATUS_PIPELINE[currentIdx]} → ${nextStatus} (${location})`);
            }
        } catch (error) {
            console.error('[Logistics Engine] Error:', error.message);
        }
    }, 10 * 60 * 1000); // Check every 10 minutes
};
