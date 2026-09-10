-- Keep booking-month filtering consistent for visits created before bookingMonth/bookingYear were populated.
UPDATE `visits`
SET `bookingMonth` = MONTH(`scheduledAt`),
    `bookingYear` = YEAR(`scheduledAt`)
WHERE `bookingMonth` IS NULL OR `bookingYear` IS NULL;
