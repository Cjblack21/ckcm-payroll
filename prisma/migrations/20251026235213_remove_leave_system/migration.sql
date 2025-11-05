-- CreateTable
CREATE TABLE `users` (
    `users_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'PERSONNEL') NOT NULL DEFAULT 'PERSONNEL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `personnel_types_id` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_personnel_types_id_fkey`(`personnel_types_id`),
    PRIMARY KEY (`users_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `sessions_id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `users_id` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_sessionToken_key`(`sessionToken`),
    INDEX `sessions_users_id_fkey`(`users_id`),
    PRIMARY KEY (`sessions_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `activity_logs_id` VARCHAR(191) NOT NULL,
    `users_id` VARCHAR(191) NOT NULL,
    `action` ENUM('LOGIN', 'LOGOUT') NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_users_id_fkey`(`users_id`),
    INDEX `activity_logs_created_at_idx`(`createdAt`),
    PRIMARY KEY (`activity_logs_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `departments_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_name_key`(`name`),
    PRIMARY KEY (`departments_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `attendances_id` VARCHAR(191) NOT NULL,
    `users_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `timeIn` DATETIME(3) NULL,
    `timeOut` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'PRESENT', 'ABSENT', 'LATE', 'PARTIAL') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attendances_users_id_date_key`(`users_id`, `date`),
    PRIMARY KEY (`attendances_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loans` (
    `loans_id` VARCHAR(191) NOT NULL,
    `users_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `balance` DECIMAL(65, 30) NOT NULL,
    `monthlyPaymentPercent` DECIMAL(65, 30) NOT NULL DEFAULT 0.000000000000000000000000000000,
    `termMonths` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'DEFAULTED') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `purpose` VARCHAR(191) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `loans_users_id_fkey`(`users_id`),
    PRIMARY KEY (`loans_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_entries` (
    `payroll_entries_id` VARCHAR(191) NOT NULL,
    `users_id` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `basicSalary` DECIMAL(65, 30) NOT NULL,
    `overtime` DECIMAL(65, 30) NOT NULL DEFAULT 0.000000000000000000000000000000,
    `deductions` DECIMAL(65, 30) NOT NULL DEFAULT 0.000000000000000000000000000000,
    `netPay` DECIMAL(65, 30) NOT NULL,
    `status` ENUM('PENDING', 'RELEASED', 'ARCHIVED') NOT NULL DEFAULT 'PENDING',
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `releasedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payroll_entries_users_id_fkey`(`users_id`),
    PRIMARY KEY (`payroll_entries_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `holidays_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `type` ENUM('NATIONAL', 'RELIGIOUS', 'COMPANY') NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`holidays_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `events_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `type` ENUM('PAYROLL', 'HR', 'MEETING', 'TRAINING', 'OTHER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`events_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deduction_types` (
    `deduction_types_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.000000000000000000000000000000,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isMandatory` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `deduction_types_name_key`(`name`),
    PRIMARY KEY (`deduction_types_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deductions` (
    `deductions_id` VARCHAR(191) NOT NULL,
    `users_id` VARCHAR(191) NOT NULL,
    `deduction_types_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `deductions_deduction_types_id_fkey`(`deduction_types_id`),
    INDEX `deductions_users_id_fkey`(`users_id`),
    PRIMARY KEY (`deductions_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `personnel_types` (
    `personnel_types_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `basicSalary` DECIMAL(65, 30) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `personnel_types_name_key`(`name`),
    PRIMARY KEY (`personnel_types_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_settings` (
    `attendance_settings_id` VARCHAR(191) NOT NULL,
    `timeInStart` VARCHAR(191) NULL,
    `timeInEnd` VARCHAR(191) NULL,
    `noTimeInCutoff` BOOLEAN NOT NULL DEFAULT false,
    `timeOutStart` VARCHAR(191) NULL,
    `timeOutEnd` VARCHAR(191) NULL,
    `noTimeOutCutoff` BOOLEAN NOT NULL DEFAULT false,
    `lateDeductionEnabled` BOOLEAN NOT NULL DEFAULT true,
    `lateDeductionRate` DECIMAL(65, 30) NOT NULL DEFAULT 0.010000000000000000000000000000,
    `maxLateDeduction` DECIMAL(65, 30) NOT NULL DEFAULT 0.500000000000000000000000000000,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `autoMarkAbsent` BOOLEAN NOT NULL DEFAULT true,
    `autoMarkLate` BOOLEAN NOT NULL DEFAULT true,
    `periodEnd` DATETIME(3) NULL,
    `periodStart` DATETIME(3) NULL,
    `payrollReleaseTime` VARCHAR(191) NULL DEFAULT '17:00',

    PRIMARY KEY (`attendance_settings_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `header_settings` (
    `id` VARCHAR(191) NOT NULL,
    `schoolName` VARCHAR(191) NOT NULL,
    `schoolAddress` VARCHAR(191) NOT NULL,
    `systemName` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NOT NULL DEFAULT '/ckcm.png',
    `showLogo` BOOLEAN NOT NULL DEFAULT true,
    `headerAlignment` VARCHAR(191) NOT NULL DEFAULT 'center',
    `fontSize` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `customText` VARCHAR(191) NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `workingDays` LONGTEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_schedules` (
    `payroll_schedule_id` VARCHAR(191) NOT NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`payroll_schedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_settings` (
    `user_settings_id` VARCHAR(191) NOT NULL,
    `users_id` VARCHAR(191) NOT NULL,
    `theme` VARCHAR(191) NOT NULL DEFAULT 'light',
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `payrollNotifications` BOOLEAN NOT NULL DEFAULT true,
    `systemNotifications` BOOLEAN NOT NULL DEFAULT true,
    `attendanceReminders` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_settings_users_id_key`(`users_id`),
    PRIMARY KEY (`user_settings_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_personnel_types_id_fkey` FOREIGN KEY (`personnel_types_id`) REFERENCES `personnel_types`(`personnel_types_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users`(`users_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users`(`users_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users`(`users_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users`(`users_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_entries` ADD CONSTRAINT `payroll_entries_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users`(`users_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deductions` ADD CONSTRAINT `deductions_deduction_types_id_fkey` FOREIGN KEY (`deduction_types_id`) REFERENCES `deduction_types`(`deduction_types_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deductions` ADD CONSTRAINT `deductions_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users`(`users_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users`(`users_id`) ON DELETE CASCADE ON UPDATE CASCADE;
