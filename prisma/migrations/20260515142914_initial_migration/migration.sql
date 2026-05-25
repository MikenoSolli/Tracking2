-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `company_type` ENUM('INDIVIDUAL', 'COMPANY') NOT NULL DEFAULT 'COMPANY',
    `service_type` ENUM('FLEET', 'MECHANIC') NOT NULL DEFAULT 'FLEET',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_company_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('USER', 'ADMIN', 'MECHANIC', 'OWNER') NOT NULL DEFAULT 'USER',
    `company_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `verification_token` VARCHAR(191) NULL,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    UNIQUE INDEX `user_verification_token_key`(`verification_token`),
    INDEX `idx_user_company_role`(`company_id`, `role`),
    INDEX `idx_user_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `Type` ENUM('TRACTOR', 'TRUCK', 'CAR', 'BUS', 'MOTORCYCLE', 'VAN', 'PICKUP') NOT NULL DEFAULT 'TRACTOR',
    `plateNumber` VARCHAR(191) NULL,
    `make` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `year` INTEGER NULL,
    `Imei` VARCHAR(191) NULL,
    `driverId` VARCHAR(191) NULL,
    `capacity` INTEGER NULL,
    `company_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vehicle_plateNumber_key`(`plateNumber`),
    UNIQUE INDEX `Vehicle_Imei_key`(`Imei`),
    UNIQUE INDEX `Vehicle_driverId_key`(`driverId`),
    INDEX `idx_vehicle_company`(`company_id`),
    INDEX `idx_vehicle_imei`(`Imei`),
    INDEX `idx_vehicle_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `license_no` VARCHAR(191) NULL,
    `performance` DOUBLE NOT NULL DEFAULT 100,
    `licence_exp` DATE NULL,
    `company_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_driver_company`(`company_id`),
    INDEX `idx_driver_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_assignment` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `driver_id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `assigned_by` INTEGER NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unassigned_at` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `idx_assignment_driver`(`driver_id`, `assigned_at`),
    INDEX `idx_assignment_vehicle`(`vehicle_id`, `assigned_at`),
    INDEX `idx_assignment_driver_active`(`driver_id`, `unassigned_at`),
    INDEX `idx_assignment_vehicle_active`(`vehicle_id`, `unassigned_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_access` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `access_type` ENUM('FULL', 'MAINTENANCE_ONLY', 'VIEW_ONLY') NOT NULL DEFAULT 'VIEW_ONLY',
    `granted_by` INTEGER NOT NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `idx_user_access`(`user_id`, `is_active`),
    INDEX `idx_vehicle_access`(`vehicle_id`, `is_active`),
    UNIQUE INDEX `unique_vehicle_user`(`vehicle_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `status` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `speed` DOUBLE NULL DEFAULT 0,
    `course` DOUBLE NULL DEFAULT 0,
    `satellites` INTEGER NULL DEFAULT 0,
    `altitude` DOUBLE NULL,
    `fuel_level` DOUBLE NULL DEFAULT 100,
    `engine_hours` DOUBLE NULL DEFAULT 0,
    `engine_rpm` INTEGER NULL DEFAULT 2400,
    `engine_temp` DOUBLE NULL DEFAULT 80,
    `engine_load` DOUBLE NULL DEFAULT 0,
    `oil_pressure` DOUBLE NULL DEFAULT 0,
    `batt_voltage` DOUBLE NULL DEFAULT 0,
    `odometer` DOUBLE NULL DEFAULT 0,
    `state` ENUM('ACTIVE', 'IDLE', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
    `location_updated_at` DATETIME(3) NULL,
    `telemetry_updated_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `status_vehicle_id_key`(`vehicle_id`),
    INDEX `idx_status_state`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gps_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `speed` DOUBLE NULL,
    `course` DOUBLE NULL,
    `satellites` INTEGER NULL,
    `altitude` DOUBLE NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `distance_from_last` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_gps_vehicle_time`(`vehicle_id`, `timestamp`),
    INDEX `idx_gps_event_type`(`event_type`),
    INDEX `idx_gps_timestamp`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telemetry_data` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `engine_rpm` INTEGER NULL,
    `engine_temp` DOUBLE NULL,
    `engine_load` DOUBLE NULL,
    `engine_hours` DOUBLE NULL,
    `fuel_level` DOUBLE NULL,
    `fuel_used` DOUBLE NULL,
    `oil_pressure` DOUBLE NULL,
    `battery_voltage` DOUBLE NULL,
    `odometer` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_telemetry_vehicle_time`(`vehicle_id`, `timestamp`),
    INDEX `idx_telemetry_timestamp`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `mechanic_id` INTEGER NULL,
    `service_company_id` INTEGER NULL,
    `service_date` DATETIME(3) NOT NULL,
    `scheduled_date` DATETIME(3) NOT NULL,
    `next_service_date` DATETIME(3) NULL,
    `description` VARCHAR(191) NOT NULL,
    `cost` DOUBLE NULL,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `notes` TEXT NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_maintenance_vehicle_status`(`vehicle_id`, `status`),
    INDEX `idx_maintenance_mechanic`(`mechanic_id`, `status`),
    INDEX `idx_maintenance_service_company`(`service_company_id`),
    INDEX `idx_maintenance_scheduled`(`scheduled_date`),
    INDEX `idx_maintenance_vehicle_schedule`(`vehicle_id`, `scheduled_date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_data` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `fuel_rate` DOUBLE NULL,
    `fuel_eff` DOUBLE NULL,
    `engine_hours` DOUBLE NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_maintenance_data_vehicle`(`vehicle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_faults` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `maintenance_id` VARCHAR(191) NULL,
    `fault_code` VARCHAR(10) NOT NULL,
    `description` TEXT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `detected_at` DATETIME(3) NOT NULL,
    `cleared_at` DATETIME(3) NULL,
    `cleared_by` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `idx_faults_vehicle_active`(`vehicle_id`, `is_active`, `detected_at`),
    INDEX `idx_fault_code`(`fault_code`),
    INDEX `idx_active_faults`(`is_active`, `severity`),
    INDEX `idx_faults_maintenance`(`maintenance_id`),
    INDEX `idx_fault_code_active`(`fault_code`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fault_code_definitions` (
    `code` VARCHAR(10) NOT NULL,
    `description` TEXT NOT NULL,
    `system_type` ENUM('ENGINE', 'TRANSMISSION', 'ABS', 'AIRBAG', 'EMISSION', 'ELECTRICAL', 'FUEL', 'COOLING', 'OTHER') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `recommended_action` TEXT NULL,

    INDEX `idx_system_type`(`system_type`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alert` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `driver_id` VARCHAR(191) NULL,
    `type` ENUM('SPEEDING', 'GEOFENCE_EXIT', 'GEOFENCE_ENTER', 'LOW_FUEL', 'MAINTENANCE_DUE', 'FAULT', 'STOP', 'HARSH_BRAKING', 'HARSH_ACCELERATION', 'OVERSPEED', 'ENGINE_OVERHEAT', 'LOW_BATTERY', 'MECHANICAL_FAULT') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `message` VARCHAR(191) NOT NULL,
    `alert_category` ENUM('GEOFENCE', 'SPEED', 'MAINTENANCE', 'MECHANICAL', 'FUEL', 'BATTERY', 'ENGINE', 'SECURITY', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `is_maintenance_related` BOOLEAN NOT NULL DEFAULT false,
    `assigned_mechanic_id` INTEGER NULL,
    `maintenance_id` VARCHAR(191) NULL,
    `fault_id` BIGINT NULL,
    `acknowledged_at` DATETIME(3) NULL,
    `acknowledged_by` INTEGER NULL,
    `resolved_at` DATETIME(3) NULL,
    `is_resolved` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_alert_driver`(`driver_id`),
    INDEX `idx_alert_vehicle`(`vehicle_id`),
    INDEX `idx_alert_maintenance`(`is_maintenance_related`, `vehicle_id`, `created_at`),
    INDEX `idx_alert_mechanic`(`assigned_mechanic_id`, `acknowledged_at`),
    INDEX `idx_alert_unresolved`(`is_resolved`, `severity`),
    INDEX `idx_alert_maintenance_id`(`maintenance_id`),
    INDEX `idx_alert_fault_id`(`fault_id`),
    INDEX `idx_alert_vehicle_unresolved`(`vehicle_id`, `is_resolved`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trip` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `distance` DOUBLE NOT NULL DEFAULT 0,
    `fuel_used` DOUBLE NOT NULL DEFAULT 0,
    `start_loc` VARCHAR(191) NULL,
    `end_loc` VARCHAR(191) NULL,

    INDEX `idx_trip_vehicle_time`(`vehicle_id`, `start_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dailySummary` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `mode_fuel_level` DOUBLE NULL,
    `mode_oil_pressure` DOUBLE NULL,
    `mode_batt_voltage` DOUBLE NULL,
    `mode_engine_load` DOUBLE NULL,
    `mode_speed` DOUBLE NULL,
    `mode_engine_rpm` DOUBLE NULL,
    `mode_engine_temp` DOUBLE NULL,
    `total_distance` DOUBLE NOT NULL DEFAULT 0,
    `total_fuel_used` DOUBLE NOT NULL DEFAULT 0,
    `total_engine_hrs` DOUBLE NOT NULL DEFAULT 0,
    `idle_time` DOUBLE NOT NULL DEFAULT 0,
    `running_time` DOUBLE NOT NULL DEFAULT 0,
    `sample_count` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_daily_summary_date`(`date`),
    UNIQUE INDEX `unique_vehicle_date`(`vehicle_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(50) NOT NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_user`(`user_id`, `timestamp`),
    INDEX `idx_audit_entity`(`entity_type`, `entity_id`, `timestamp`),
    INDEX `idx_audit_action`(`action`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `user_agent` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_token_hash_key`(`token_hash`),
    INDEX `idx_session_user`(`user_id`),
    INDEX `idx_session_expires`(`expires_at`),
    INDEX `idx_session_token`(`token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle` ADD CONSTRAINT `vehicle_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle` ADD CONSTRAINT `vehicle_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver` ADD CONSTRAINT `driver_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_assignment` ADD CONSTRAINT `driver_assignment_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_assignment` ADD CONSTRAINT `driver_assignment_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_assignment` ADD CONSTRAINT `driver_assignment_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_access` ADD CONSTRAINT `vehicle_access_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_access` ADD CONSTRAINT `vehicle_access_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_access` ADD CONSTRAINT `vehicle_access_granted_by_fkey` FOREIGN KEY (`granted_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `status` ADD CONSTRAINT `status_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gps_events` ADD CONSTRAINT `gps_events_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telemetry_data` ADD CONSTRAINT `telemetry_data_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_mechanic_id_fkey` FOREIGN KEY (`mechanic_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_service_company_id_fkey` FOREIGN KEY (`service_company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_data` ADD CONSTRAINT `maintenance_data_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_faults` ADD CONSTRAINT `vehicle_faults_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_faults` ADD CONSTRAINT `vehicle_faults_maintenance_id_fkey` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_faults` ADD CONSTRAINT `vehicle_faults_cleared_by_fkey` FOREIGN KEY (`cleared_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_faults` ADD CONSTRAINT `vehicle_faults_fault_code_fkey` FOREIGN KEY (`fault_code`) REFERENCES `fault_code_definitions`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert` ADD CONSTRAINT `alert_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert` ADD CONSTRAINT `alert_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert` ADD CONSTRAINT `alert_assigned_mechanic_id_fkey` FOREIGN KEY (`assigned_mechanic_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert` ADD CONSTRAINT `alert_maintenance_id_fkey` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert` ADD CONSTRAINT `alert_fault_id_fkey` FOREIGN KEY (`fault_id`) REFERENCES `vehicle_faults`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert` ADD CONSTRAINT `alert_acknowledged_by_fkey` FOREIGN KEY (`acknowledged_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip` ADD CONSTRAINT `trip_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dailySummary` ADD CONSTRAINT `dailySummary_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
