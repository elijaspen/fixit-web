<?php

return [
    // Booking fee tiers (no VAT)
    'booking_fee' => [
        'simple' => (float) env('BOOKING_FEE_SIMPLE', 10.0),
        'standard' => (float) env('BOOKING_FEE_STANDARD', 20.0),
        'complex' => (float) env('BOOKING_FEE_COMPLEX', 40.0),
    ],
];


