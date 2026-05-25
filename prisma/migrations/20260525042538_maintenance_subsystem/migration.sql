-- AlterTable
ALTER TABLE `maintenance` ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `origin` ENUM('INTERVAL', 'FAULT', 'MANUAL', 'DRIVER') NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `template_id` VARCHAR(191) NULL,
    MODIFY `status` ENUM('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_PARTS', 'ON_HOLD', 'COMPLETED', 'APPROVED', 'CANCELLED', 'ESCALATED') NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE `status` ADD COLUMN `distance` DOUBLE NULL,
    ADD COLUMN `fuelUsed` DOUBLE NULL;

-- CreateTable
CREATE TABLE `maintenance_templates` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `vehicle_type` ENUM('TRACTOR', 'TRUCK', 'CAR', 'BUS', 'MOTORCYCLE', 'VAN', 'PICKUP') NULL,
    `time_interval_days` INTEGER NULL,
    `mileage_interval_km` DOUBLE NULL,
    `engine_hours_interval` DOUBLE NULL,
    `default_severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `estimated_cost` DOUBLE NULL,
    `estimated_duration` DOUBLE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_template_company`(`company_id`, `is_active`),
    INDEX `idx_template_vehicle_type`(`vehicle_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_subscription` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `subscription_type` ENUM('BASIC', 'STANDARD', 'ADVANCED', 'CUSTOM', 'ENTERPRISE') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `activated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_subscription_vehicle_id_key`(`vehicle_id`),
    INDEX `idx_subscription_vehicle`(`vehicle_id`, `is_active`),
    INDEX `idx_subscription_type`(`subscription_type`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_feature_config` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_subscription_id` VARCHAR(191) NOT NULL,
    `feature_type` ENUM('GPS_TRACKING', 'SPEED_MONITORING', 'FUEL_MONITORING', 'ENGINE_TELEMETRY', 'OBD_DIAGNOSTICS', 'GEOFENCING', 'DRIVER_BEHAVIOR', 'MAINTENANCE_TRACKING', 'CUSTOM_SENSORS', 'TEMPERATURE_MONITORING', 'HUMIDITY_MONITORING', 'CARGO_MONITORING', 'REFRIGERATION', 'TIRE_PRESSURE', 'WEIGHT_SENSOR', 'VIDEO_TELEMATICS') NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `config` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_feature_type`(`feature_type`, `is_enabled`),
    UNIQUE INDEX `unique_subscription_feature`(`vehicle_subscription_id`, `feature_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_sensor` (
    `id` VARCHAR(191) NOT NULL,
    `feature_config_id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `sensor_name` VARCHAR(191) NOT NULL,
    `sensor_type` ENUM('TEMPERATURE', 'PRESSURE', 'HUMIDITY', 'WEIGHT', 'VOLUME', 'DISTANCE', 'BINARY', 'COUNTER', 'OTHER') NOT NULL,
    `unit` VARCHAR(191) NULL,
    `min_value` DOUBLE NULL,
    `max_value` DOUBLE NULL,
    `alert_threshold` DOUBLE NULL,
    `alert_condition` ENUM('ABOVE', 'BELOW', 'EQUALS', 'BETWEEN', 'OUTSIDE') NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_custom_sensor_vehicle`(`vehicle_id`, `is_active`),
    INDEX `idx_sensor_type`(`sensor_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_sensor_reading` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sensor_id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_sensor_reading_time`(`sensor_id`, `timestamp`),
    INDEX `idx_vehicle_sensor_time`(`vehicle_id`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_maintenance_template` ON `maintenance`(`template_id`);

-- CreateIndex
CREATE INDEX `idx_maintenance_origin` ON `maintenance`(`origin`);

-- AddForeignKey
ALTER TABLE `maintenance_templates` ADD CONSTRAINT `maintenance_templates_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `maintenance_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_subscription` ADD CONSTRAINT `vehicle_subscription_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_feature_config` ADD CONSTRAINT `vehicle_feature_config_vehicle_subscription_id_fkey` FOREIGN KEY (`vehicle_subscription_id`) REFERENCES `vehicle_subscription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_sensor` ADD CONSTRAINT `custom_sensor_feature_config_id_fkey` FOREIGN KEY (`feature_config_id`) REFERENCES `vehicle_feature_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_sensor` ADD CONSTRAINT `custom_sensor_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_sensor_reading` ADD CONSTRAINT `custom_sensor_reading_sensor_id_fkey` FOREIGN KEY (`sensor_id`) REFERENCES `custom_sensor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_sensor_reading` ADD CONSTRAINT `custom_sensor_reading_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
