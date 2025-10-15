-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 08, 2025 at 05:01 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ckcm_payroll`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendances`
--

CREATE TABLE `attendances` (
  `attendances_id` varchar(191) NOT NULL,
  `users_id` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL,
  `timeIn` datetime(3) DEFAULT NULL,
  `timeOut` datetime(3) DEFAULT NULL,
  `status` enum('PENDING','PRESENT','ABSENT','LATE','PARTIAL') NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendances`
--

INSERT INTO `attendances` (`attendances_id`, `users_id`, `date`, `timeIn`, `timeOut`, `status`, `createdAt`, `updatedAt`) VALUES
('cmfy5vano0002xkmoptcsttcj', '607769', '2025-09-26 00:00:00.000', '2025-09-26 03:39:47.572', '2025-09-26 03:42:44.950', 'LATE', '2025-09-24 15:50:53.362', '2025-09-26 03:42:44.984'),
('cmfy5vano0003xkmojqoukrm9', '607769', '2025-09-27 00:00:00.000', NULL, NULL, 'ABSENT', '2025-09-24 15:50:53.362', '2025-09-24 16:08:33.122'),
('cmfy5vano0008xkmo4cbm44gt', '787832', '2025-09-26 00:00:00.000', '2025-09-26 03:44:51.662', '2025-09-26 04:18:47.831', 'LATE', '2025-09-24 15:50:53.362', '2025-09-26 04:18:47.861'),
('cmfy5vano0009xkmof09xgatd', '787832', '2025-09-27 00:00:00.000', NULL, NULL, 'ABSENT', '2025-09-24 15:50:53.362', '2025-09-24 16:08:33.122'),
('cmfy5vano000fxkmoaxuq6gfm', '822227', '2025-09-27 00:00:00.000', NULL, NULL, 'ABSENT', '2025-09-24 15:50:53.362', '2025-09-24 16:08:33.122'),
('cmg1w90ff0000xkzgz183b04x', '607769', '2025-09-28 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-27 06:32:41.834', '2025-09-27 06:32:41.834'),
('cmg1w90fu0001xkzghv95dukj', '607769', '2025-09-29 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-27 06:32:41.834', '2025-09-27 06:32:41.834'),
('cmg1w90fu0002xkzg40atlc4w', '787832', '2025-09-28 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-27 06:32:41.834', '2025-09-27 06:32:41.834'),
('cmg1w90fu0003xkzggd5vhdsg', '787832', '2025-09-29 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-27 06:32:41.834', '2025-09-27 06:32:41.834'),
('cmg1w90fu0004xkzgn53i774b', '822227', '2025-09-28 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-27 06:32:41.834', '2025-09-27 06:32:41.834'),
('cmg1w90fu0005xkzgofc6qbn7', '822227', '2025-09-29 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-27 06:32:41.834', '2025-09-27 06:32:41.834'),
('cmg1wt0m50000xkkg6oav9xud', '607769', '2025-09-23 16:00:00.000', NULL, NULL, 'ABSENT', '2025-09-27 06:48:15.197', '2025-09-27 07:04:49.046'),
('cmg1wt0m60001xkkg29x123oq', '607769', '2025-09-24 16:00:00.000', NULL, NULL, 'ABSENT', '2025-09-27 06:48:15.197', '2025-09-27 07:04:49.046'),
('cmg1wt0m60003xkkgtpb09gb3', '787832', '2025-09-23 16:00:00.000', NULL, NULL, 'ABSENT', '2025-09-27 06:48:15.197', '2025-09-27 07:04:49.046'),
('cmg1wt0m60004xkkgsbwttru5', '787832', '2025-09-24 16:00:00.000', NULL, NULL, 'ABSENT', '2025-09-27 06:48:15.197', '2025-09-27 07:04:49.046'),
('cmg1wt0m60006xkkgjw98sbg0', '822227', '2025-09-23 16:00:00.000', NULL, NULL, 'ABSENT', '2025-09-27 06:48:15.197', '2025-09-27 07:04:49.046'),
('cmg1wt0m60007xkkgtmg2twq7', '822227', '2025-09-24 16:00:00.000', NULL, NULL, 'ABSENT', '2025-09-27 06:48:15.197', '2025-09-27 07:04:49.046'),
('cmg1wt0m60008xkkg9rg4abzm', '822227', '2025-09-25 16:00:00.000', NULL, NULL, 'ABSENT', '2025-09-27 06:48:15.197', '2025-09-27 07:04:49.046'),
('cmg38fu6k0000rvpkmvy0tk3x', '222365', '2025-09-26 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-28 05:01:41.899', '2025-09-28 05:01:41.899'),
('cmg38fu6p0001rvpk5984xp8y', '607769', '2025-09-26 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-28 05:01:41.899', '2025-09-28 05:01:41.899'),
('cmg38fu6p0002rvpka7hz5mgg', '787832', '2025-09-26 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-28 05:01:41.899', '2025-09-28 05:01:41.899'),
('cmg38fu6p0003rvpk5ib536s3', '822227', '2025-09-26 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-28 05:01:41.899', '2025-09-28 05:01:41.899'),
('cmg38h67g000drvpk6fc4mgua', '222365', '2025-09-25 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-28 05:02:44.141', '2025-09-28 05:02:44.141'),
('cmg38h67h000frvpkbdd1471b', '607769', '2025-09-25 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-28 05:02:44.141', '2025-09-28 05:02:44.141'),
('cmg38h67h000hrvpk63tz26k2', '787832', '2025-09-25 16:00:00.000', NULL, NULL, 'PENDING', '2025-09-28 05:02:44.141', '2025-09-28 05:02:44.141');

-- --------------------------------------------------------

--
-- Table structure for table `attendance_settings`
--

CREATE TABLE `attendance_settings` (
  `attendance_settings_id` varchar(191) NOT NULL,
  `timeInStart` varchar(191) DEFAULT NULL,
  `timeInEnd` varchar(191) DEFAULT NULL,
  `noTimeInCutoff` tinyint(1) NOT NULL DEFAULT 0,
  `timeOutStart` varchar(191) DEFAULT NULL,
  `timeOutEnd` varchar(191) DEFAULT NULL,
  `noTimeOutCutoff` tinyint(1) NOT NULL DEFAULT 0,
  `lateDeductionEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `lateDeductionRate` decimal(65,30) NOT NULL DEFAULT 0.010000000000000000000000000000,
  `maxLateDeduction` decimal(65,30) NOT NULL DEFAULT 0.500000000000000000000000000000,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `autoMarkAbsent` tinyint(1) NOT NULL DEFAULT 1,
  `autoMarkLate` tinyint(1) NOT NULL DEFAULT 1,
  `periodEnd` datetime(3) DEFAULT NULL,
  `periodStart` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendance_settings`
--

INSERT INTO `attendance_settings` (`attendance_settings_id`, `timeInStart`, `timeInEnd`, `noTimeInCutoff`, `timeOutStart`, `timeOutEnd`, `noTimeOutCutoff`, `lateDeductionEnabled`, `lateDeductionRate`, `maxLateDeduction`, `createdAt`, `updatedAt`, `autoMarkAbsent`, `autoMarkLate`, `periodEnd`, `periodStart`) VALUES
('cmfpkuvey0002xk64qig9r0zg', '07:00', '09:00', 0, '17:00', '19:00', 0, 1, 0.010000000000000000000000000000, 0.500000000000000000000000000000, '2025-09-18 15:40:32.265', '2025-09-28 05:03:07.401', 1, 1, '2025-09-29 15:59:59.999', '2025-09-27 16:00:00.000');

-- --------------------------------------------------------

--
-- Table structure for table `deductions`
--

CREATE TABLE `deductions` (
  `deductions_id` varchar(191) NOT NULL,
  `users_id` varchar(191) NOT NULL,
  `deduction_types_id` varchar(191) NOT NULL,
  `amount` decimal(65,30) NOT NULL,
  `appliedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `deductions`
--

INSERT INTO `deductions` (`deductions_id`, `users_id`, `deduction_types_id`, `amount`, `appliedAt`, `notes`, `createdAt`, `updatedAt`) VALUES
('cmg0gx494004ixktkjo0umqd2', '607769', 'cmfqggctq0002xkesbhghmzpr', 300.000000000000000000000000000000, '2025-09-26 06:35:46.504', '', '2025-09-26 06:35:46.504', '2025-09-26 06:35:46.504'),
('cmg0gx494004kxktkye5nwi9g', '787832', 'cmfqggctq0002xkesbhghmzpr', 300.000000000000000000000000000000, '2025-09-26 06:35:46.504', '', '2025-09-26 06:35:46.504', '2025-09-26 06:35:46.504'),
('cmg0gx494004mxktk6lopmw4f', '822227', 'cmfqggctq0002xkesbhghmzpr', 300.000000000000000000000000000000, '2025-09-26 06:35:46.504', '', '2025-09-26 06:35:46.504', '2025-09-26 06:35:46.504'),
('cmg0juilo0001xk98jkrijmql', '607769', 'cmfqggsxy0003xkesb9easqe5', 150.000000000000000000000000000000, '2025-09-26 07:57:43.972', '', '2025-09-26 07:57:43.972', '2025-09-26 07:57:43.972'),
('cmg0juilp0003xk98xn8i3q5w', '787832', 'cmfqggsxy0003xkesb9easqe5', 150.000000000000000000000000000000, '2025-09-26 07:57:43.972', '', '2025-09-26 07:57:43.972', '2025-09-26 07:57:43.972'),
('cmg0juilp0005xk984cr3shx9', '822227', 'cmfqggsxy0003xkesb9easqe5', 150.000000000000000000000000000000, '2025-09-26 07:57:43.972', '', '2025-09-26 07:57:43.972', '2025-09-26 07:57:43.972');

-- --------------------------------------------------------

--
-- Table structure for table `deduction_types`
--

CREATE TABLE `deduction_types` (
  `deduction_types_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `amount` decimal(65,30) NOT NULL DEFAULT 0.000000000000000000000000000000,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `deduction_types`
--

INSERT INTO `deduction_types` (`deduction_types_id`, `name`, `description`, `amount`, `isActive`, `createdAt`, `updatedAt`) VALUES
('cmfqggctq0002xkesbhghmzpr', 'SSS', 'sss', 300.000000000000000000000000000000, 1, '2025-09-19 06:25:02.700', '2025-09-19 06:25:02.700'),
('cmfqggsxy0003xkesb9easqe5', 'Philhealth', '', 150.000000000000000000000000000000, 1, '2025-09-19 06:25:23.589', '2025-09-19 06:25:23.589');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `departments_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `events_id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `date` datetime(3) NOT NULL,
  `type` enum('PAYROLL','HR','MEETING','TRAINING','OTHER') NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `header_settings`
--

CREATE TABLE `header_settings` (
  `id` varchar(191) NOT NULL,
  `schoolName` varchar(191) NOT NULL,
  `schoolAddress` varchar(191) NOT NULL,
  `systemName` varchar(191) NOT NULL,
  `logoUrl` varchar(191) NOT NULL DEFAULT '/ckcm.png',
  `showLogo` tinyint(1) NOT NULL DEFAULT 1,
  `headerAlignment` varchar(191) NOT NULL DEFAULT 'center',
  `fontSize` varchar(191) NOT NULL DEFAULT 'medium',
  `customText` varchar(191) DEFAULT '',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `workingDays` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`workingDays`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `header_settings`
--

INSERT INTO `header_settings` (`id`, `schoolName`, `schoolAddress`, `systemName`, `logoUrl`, `showLogo`, `headerAlignment`, `fontSize`, `customText`, `createdAt`, `updatedAt`, `workingDays`) VALUES
('cmfqa92eu0000xkjofofknoxr', 'Christ the King College de Maranding Inc.', 'Maranding Lala Lanao del Norte', 'Payroll Monitoring System', '/ckcm.png', 1, 'center', 'medium', '', '2025-09-19 03:31:24.917', '2025-09-27 07:40:55.764', '[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\",\"Saturday\"]');

-- --------------------------------------------------------

--
-- Table structure for table `holidays`
--

CREATE TABLE `holidays` (
  `holidays_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL,
  `type` enum('NATIONAL','RELIGIOUS','COMPANY') NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `loans`
--

CREATE TABLE `loans` (
  `loans_id` varchar(191) NOT NULL,
  `users_id` varchar(191) NOT NULL,
  `amount` decimal(65,30) NOT NULL,
  `balance` decimal(65,30) NOT NULL,
  `monthlyPaymentPercent` decimal(65,30) NOT NULL DEFAULT 0.000000000000000000000000000000,
  `termMonths` int(11) NOT NULL,
  `status` enum('ACTIVE','COMPLETED','DEFAULTED') NOT NULL DEFAULT 'ACTIVE',
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) NOT NULL,
  `purpose` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `loans`
--

INSERT INTO `loans` (`loans_id`, `users_id`, `amount`, `balance`, `monthlyPaymentPercent`, `termMonths`, `status`, `startDate`, `endDate`, `purpose`, `createdAt`, `updatedAt`) VALUES
('cmfqgfc1o0001xkesujiu8sf0', '607769', 40000.000000000000000000000000000000, 40000.000000000000000000000000000000, 2.000000000000000000000000000000, 24, 'ACTIVE', '2025-09-19 06:24:15.015', '2027-09-19 06:24:15.015', 'New Car', '2025-09-19 06:24:15.022', '2025-09-19 06:24:15.022');

-- --------------------------------------------------------

--
-- Table structure for table `payroll_entries`
--

CREATE TABLE `payroll_entries` (
  `payroll_entries_id` varchar(191) NOT NULL,
  `users_id` varchar(191) NOT NULL,
  `periodStart` datetime(3) NOT NULL,
  `periodEnd` datetime(3) NOT NULL,
  `basicSalary` decimal(65,30) NOT NULL,
  `overtime` decimal(65,30) NOT NULL DEFAULT 0.000000000000000000000000000000,
  `deductions` decimal(65,30) NOT NULL DEFAULT 0.000000000000000000000000000000,
  `netPay` decimal(65,30) NOT NULL,
  `status` enum('PENDING','RELEASED','ARCHIVED') NOT NULL DEFAULT 'PENDING',
  `processedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `releasedAt` datetime(3) DEFAULT NULL,
  `archivedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payroll_entries`
--

INSERT INTO `payroll_entries` (`payroll_entries_id`, `users_id`, `periodStart`, `periodEnd`, `basicSalary`, `overtime`, `deductions`, `netPay`, `status`, `processedAt`, `releasedAt`, `archivedAt`, `createdAt`, `updatedAt`) VALUES
('cmg1xg1xa0001xk180o1fi4eh', '607769', '2025-09-23 16:00:00.000', '2025-09-26 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 12514.509027777780000000000000000000, 2485.490972222222000000000000000000, 'ARCHIVED', '2025-09-27 07:06:09.977', '2025-09-27 07:16:05.440', '2025-09-27 07:22:09.751', '2025-09-27 07:06:09.977', '2025-09-27 07:22:09.754'),
('cmg1xg1y70003xk186xljc9d4', '787832', '2025-09-23 16:00:00.000', '2025-09-26 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 12167.302430555560000000000000000000, 2832.697569444445000000000000000000, 'ARCHIVED', '2025-09-27 07:06:10.016', '2025-09-27 07:16:05.440', '2025-09-27 07:22:09.751', '2025-09-27 07:06:10.016', '2025-09-27 07:22:09.754'),
('cmg1xg1yd0005xk18xozve5rl', '822227', '2025-09-23 16:00:00.000', '2025-09-26 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15450.000000000000000000000000000000, -450.000000000000000000000000000000, 'ARCHIVED', '2025-09-27 07:06:10.021', '2025-09-27 07:16:05.440', '2025-09-27 07:22:09.751', '2025-09-27 07:06:10.021', '2025-09-27 07:22:09.754'),
('cmg1y0mg60008xk18jsyqs1kp', '607769', '2025-09-26 16:00:00.000', '2025-09-30 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 5850.000000000000000000000000000000, 9150.000000000000000000000000000000, 'PENDING', '2025-09-27 07:22:09.700', NULL, NULL, '2025-09-27 07:22:09.700', '2025-09-27 07:22:09.700'),
('cmg1y0mgz000axk184vjhdd78', '787832', '2025-09-26 16:00:00.000', '2025-09-30 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 5450.000000000000000000000000000000, 9550.000000000000000000000000000000, 'PENDING', '2025-09-27 07:22:09.731', NULL, NULL, '2025-09-27 07:22:09.731', '2025-09-27 07:22:09.731'),
('cmg1y0mha000cxk186yg9xihz', '822227', '2025-09-26 16:00:00.000', '2025-09-30 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 5450.000000000000000000000000000000, 9550.000000000000000000000000000000, 'PENDING', '2025-09-27 07:22:09.742', NULL, NULL, '2025-09-27 07:22:09.742', '2025-09-27 07:22:09.742'),
('cmg38gcrn0005rvpkntrcz4yn', '222365', '2025-09-26 16:00:00.000', '2025-09-28 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 'PENDING', '2025-09-28 05:02:05.984', NULL, NULL, '2025-09-28 05:02:05.984', '2025-09-28 05:02:05.984'),
('cmg38gcsa0007rvpkvg3v40xw', '607769', '2025-09-26 16:00:00.000', '2025-09-28 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15850.000000000000000000000000000000, -850.000000000000000000000000000000, 'PENDING', '2025-09-28 05:02:06.010', NULL, NULL, '2025-09-28 05:02:06.010', '2025-09-28 05:02:06.010'),
('cmg38gcss0009rvpktve2bnqc', '787832', '2025-09-26 16:00:00.000', '2025-09-28 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15450.000000000000000000000000000000, -450.000000000000000000000000000000, 'PENDING', '2025-09-28 05:02:06.028', NULL, NULL, '2025-09-28 05:02:06.028', '2025-09-28 05:02:06.028'),
('cmg38gct5000brvpk0vfbiyzj', '822227', '2025-09-26 16:00:00.000', '2025-09-28 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15450.000000000000000000000000000000, -450.000000000000000000000000000000, 'PENDING', '2025-09-28 05:02:06.040', NULL, NULL, '2025-09-28 05:02:06.040', '2025-09-28 05:02:06.040'),
('cmg38herw000mrvpkv17bg12h', '222365', '2025-09-25 16:00:00.000', '2025-09-27 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 'RELEASED', '2025-09-28 05:02:55.244', '2025-09-28 05:03:07.383', NULL, '2025-09-28 05:02:55.244', '2025-09-28 05:03:07.390'),
('cmg38hesb000orvpkjke3k6ud', '607769', '2025-09-25 16:00:00.000', '2025-09-27 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15850.000000000000000000000000000000, -850.000000000000000000000000000000, 'RELEASED', '2025-09-28 05:02:55.259', '2025-09-28 05:03:07.383', NULL, '2025-09-28 05:02:55.259', '2025-09-28 05:03:07.390'),
('cmg38hesr000qrvpkntrievjq', '787832', '2025-09-25 16:00:00.000', '2025-09-27 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15450.000000000000000000000000000000, -450.000000000000000000000000000000, 'RELEASED', '2025-09-28 05:02:55.275', '2025-09-28 05:03:07.383', NULL, '2025-09-28 05:02:55.275', '2025-09-28 05:03:07.390'),
('cmg38het4000srvpki5tnevr3', '822227', '2025-09-25 16:00:00.000', '2025-09-27 15:59:59.999', 15000.000000000000000000000000000000, 0.000000000000000000000000000000, 15450.000000000000000000000000000000, -450.000000000000000000000000000000, 'RELEASED', '2025-09-28 05:02:55.289', '2025-09-28 05:03:07.383', NULL, '2025-09-28 05:02:55.289', '2025-09-28 05:03:07.390');

-- --------------------------------------------------------

--
-- Table structure for table `payroll_schedules`
--

CREATE TABLE `payroll_schedules` (
  `payroll_schedule_id` varchar(191) NOT NULL,
  `scheduledDate` datetime(3) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `personnel_types`
--

CREATE TABLE `personnel_types` (
  `personnel_types_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `basicSalary` decimal(65,30) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `personnel_types`
--

INSERT INTO `personnel_types` (`personnel_types_id`, `name`, `basicSalary`, `isActive`, `createdAt`, `updatedAt`) VALUES
('cmfplx8qw0002xk8o9xemut6j', 'Dean', 15000.000000000000000000000000000000, 1, '2025-09-18 16:10:22.472', '2025-09-18 16:10:22.472'),
('cmfppra460000xksktfpcj0km', 'Regular Employee', 20000.000000000000000000000000000000, 1, '2025-09-18 17:57:42.772', '2025-09-18 17:57:42.772');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `sessions_id` varchar(191) NOT NULL,
  `sessionToken` varchar(191) NOT NULL,
  `users_id` varchar(191) NOT NULL,
  `expires` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `users_id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `role` enum('ADMIN','PERSONNEL') NOT NULL DEFAULT 'PERSONNEL',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `personnel_types_id` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`users_id`, `email`, `password`, `name`, `role`, `isActive`, `personnel_types_id`, `createdAt`, `updatedAt`) VALUES
('222365', 'jersoncatadman@ckcm.edu.ph', '', 'Jerson Catadman', 'PERSONNEL', 1, 'cmfplx8qw0002xk8o9xemut6j', '2025-09-27 12:25:21.569', '2025-09-27 12:25:21.569'),
('228579', 'jamesfebrio@ckcm.edu.ph', '', 'James Bernard Febrio', 'PERSONNEL', 1, 'cmfppra460000xksktfpcj0km', '2025-09-28 05:09:28.271', '2025-09-28 05:09:28.271'),
('607769', 'mike.johnson@pms.com', '$2b$12$CB8Ef17iHigG4BZK4Bo2S.Dl2DsLbjVrnWQFNtp6P1Bk.5QCUVMPW', 'Mike Johnson', 'PERSONNEL', 1, 'cmfplx8qw0002xk8o9xemut6j', '2025-09-17 03:57:04.358', '2025-09-18 17:58:39.026'),
('764399', 'admin@pms.com', '$2b$12$CB8Ef17iHigG4BZK4Bo2S.Dl2DsLbjVrnWQFNtp6P1Bk.5QCUVMPW', 'System Administrator', 'ADMIN', 1, NULL, '2025-09-17 03:57:04.276', '2025-09-17 03:57:04.276'),
('787832', 'jane.smith@pms.com', '$2b$12$CB8Ef17iHigG4BZK4Bo2S.Dl2DsLbjVrnWQFNtp6P1Bk.5QCUVMPW', 'Jane Smith', 'PERSONNEL', 1, 'cmfplx8qw0002xk8o9xemut6j', '2025-09-17 03:57:04.342', '2025-09-18 16:10:42.993'),
('822227', 'john.doe@pms.com', '$2b$12$CB8Ef17iHigG4BZK4Bo2S.Dl2DsLbjVrnWQFNtp6P1Bk.5QCUVMPW', 'John Doe', 'PERSONNEL', 1, 'cmfplx8qw0002xk8o9xemut6j', '2025-09-17 03:57:04.318', '2025-09-18 16:10:50.455');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendances`
--
ALTER TABLE `attendances`
  ADD PRIMARY KEY (`attendances_id`),
  ADD UNIQUE KEY `attendances_users_id_date_key` (`users_id`,`date`);

--
-- Indexes for table `attendance_settings`
--
ALTER TABLE `attendance_settings`
  ADD PRIMARY KEY (`attendance_settings_id`);

--
-- Indexes for table `deductions`
--
ALTER TABLE `deductions`
  ADD PRIMARY KEY (`deductions_id`),
  ADD KEY `deductions_deduction_types_id_fkey` (`deduction_types_id`),
  ADD KEY `deductions_users_id_fkey` (`users_id`);

--
-- Indexes for table `deduction_types`
--
ALTER TABLE `deduction_types`
  ADD PRIMARY KEY (`deduction_types_id`),
  ADD UNIQUE KEY `deduction_types_name_key` (`name`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`departments_id`),
  ADD UNIQUE KEY `departments_name_key` (`name`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`events_id`);

--
-- Indexes for table `header_settings`
--
ALTER TABLE `header_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `holidays`
--
ALTER TABLE `holidays`
  ADD PRIMARY KEY (`holidays_id`);

--
-- Indexes for table `loans`
--
ALTER TABLE `loans`
  ADD PRIMARY KEY (`loans_id`),
  ADD KEY `loans_users_id_fkey` (`users_id`);

--
-- Indexes for table `payroll_entries`
--
ALTER TABLE `payroll_entries`
  ADD PRIMARY KEY (`payroll_entries_id`),
  ADD KEY `payroll_entries_users_id_fkey` (`users_id`);

--
-- Indexes for table `payroll_schedules`
--
ALTER TABLE `payroll_schedules`
  ADD PRIMARY KEY (`payroll_schedule_id`);

--
-- Indexes for table `personnel_types`
--
ALTER TABLE `personnel_types`
  ADD PRIMARY KEY (`personnel_types_id`),
  ADD UNIQUE KEY `personnel_types_name_key` (`name`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`sessions_id`),
  ADD UNIQUE KEY `sessions_sessionToken_key` (`sessionToken`),
  ADD KEY `sessions_users_id_fkey` (`users_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`users_id`),
  ADD UNIQUE KEY `users_email_key` (`email`),
  ADD KEY `users_personnel_types_id_fkey` (`personnel_types_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendances`
--
ALTER TABLE `attendances`
  ADD CONSTRAINT `attendances_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users` (`users_id`) ON UPDATE CASCADE;

--
-- Constraints for table `deductions`
--
ALTER TABLE `deductions`
  ADD CONSTRAINT `deductions_deduction_types_id_fkey` FOREIGN KEY (`deduction_types_id`) REFERENCES `deduction_types` (`deduction_types_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `deductions_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users` (`users_id`) ON UPDATE CASCADE;

--
-- Constraints for table `loans`
--
ALTER TABLE `loans`
  ADD CONSTRAINT `loans_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users` (`users_id`) ON UPDATE CASCADE;

--
-- Constraints for table `payroll_entries`
--
ALTER TABLE `payroll_entries`
  ADD CONSTRAINT `payroll_entries_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users` (`users_id`) ON UPDATE CASCADE;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_users_id_fkey` FOREIGN KEY (`users_id`) REFERENCES `users` (`users_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_personnel_types_id_fkey` FOREIGN KEY (`personnel_types_id`) REFERENCES `personnel_types` (`personnel_types_id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
