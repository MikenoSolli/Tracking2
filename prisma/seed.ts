import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();

const FAULT_CODES = [
  // ─── Engine ────────────────────────────────────────────────────────
  {
    code: "P0101",
    description:
      "Mass Air Flow (MAF) sensor circuit range/performance problem. Indicates the MAF sensor output is outside the expected range, causing incorrect air-fuel mixture calculations.",
    systemType: "ENGINE" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Inspect MAF sensor for contamination, clean with MAF sensor cleaner, check air filter, verify wiring harness integrity.",
  },
  {
    code: "P0118",
    description:
      "Engine Coolant Temperature (ECT) sensor circuit high input. Sensor voltage indicates abnormally high temperature,可能导致 incorrect fuel management and cooling fan operation.",
    systemType: "COOLING" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Test ECT sensor resistance at known temperatures, inspect wiring for shorts to voltage, check coolant level and thermostat operation.",
  },
  {
    code: "P0171",
    description:
      "System too lean (Bank 1). The oxygen sensor detects excess oxygen in exhaust, indicating the air-fuel mixture is too lean. Can cause rough idle, hesitation, and increased emissions.",
    systemType: "ENGINE" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Inspect for vacuum leaks, test fuel pressure, clean MAF sensor, check oxygen sensor operation, inspect fuel injectors.",
  },
  {
    code: "P0172",
    description:
      "System too rich (Bank 1). The oxygen sensor detects insufficient oxygen in exhaust, indicating an overly rich air-fuel mixture. Causes poor fuel economy and catalytic converter damage.",
    systemType: "ENGINE" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Check fuel pressure regulator, inspect injectors for leaking, test MAF sensor, verify EVAP system operation.",
  },
  {
    code: "P0191",
    description:
      "Fuel Rail Pressure Sensor Circuit Range/Performance. The ECM detects fuel rail pressure outside expected parameters, affecting fuel delivery and engine performance.",
    systemType: "FUEL" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Test fuel rail pressure sensor, inspect fuel pump operation, check for fuel restrictions or leaks, verify fuel pressure regulator.",
  },
  {
    code: "P0219",
    description:
      "Engine Overspeed Condition. Engine RPM exceeded the maximum safe operating threshold, typically caused by transmission issues or sudden load reduction.",
    systemType: "ENGINE" as const,
    severity: "CRITICAL" as const,
    recommendedAction:
      "Inspect transmission for slippage, check governor operation, verify throttle control mechanism, review driver behavior logs.",
  },
  {
    code: "P0251",
    description:
      "Injection Pump Fuel metering control 'A' malfunction (Cam/Rotor/Injector). Common in diesel engines, affects precise fuel delivery timing and quantity.",
    systemType: "FUEL" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Test injection pump timing, inspect fuel metering valve, check for contamination in fuel system, verify injector operation.",
  },
  {
    code: "P0261",
    description:
      "Cylinder 1 Injector Circuit Low. The ECM detects low voltage in the injector circuit, usually indicating a wiring issue or failed injector.",
    systemType: "FUEL" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test injector resistance, inspect wiring harness for shorts or opens, check injector driver circuit, replace injector if necessary.",
  },
  {
    code: "P0300",
    description:
      "Random/Multiple Cylinder Misfire Detected. The ECM detects misfires across multiple cylinders without a consistent pattern. Causes rough running, power loss, and catalytic converter damage.",
    systemType: "ENGINE" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Perform compression test, inspect spark plugs and ignition coils, check fuel pressure, test MAF and EGR systems, examine vacuum lines.",
  },
  {
    code: "P0335",
    description:
      "Crankshaft Position (CKP) Sensor Circuit Malfunction. The ECM loses crankshaft position data, typically prevents engine start or causes stalling.",
    systemType: "ENGINE" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Test CKP sensor resistance and output, inspect sensor air gap, check wiring and connector, verify reluctor ring condition.",
  },
  {
    code: "P0340",
    description:
      "Camshaft Position (CMP) Sensor Circuit Malfunction. ECM cannot determine camshaft position, affecting fuel injection timing and ignition.",
    systemType: "ENGINE" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test CMP sensor output, inspect wiring, check timing chain/belt condition, verify sensor alignment.",
  },
  {
    code: "P0401",
    description:
      "Exhaust Gas Recirculation (EGR) Flow Insufficient Detected. EGR system not recirculating enough exhaust gas, causing increased NOx emissions and potential engine knock.",
    systemType: "EMISSION" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Remove and clean EGR valve and passages, test EGR solenoid operation, inspect vacuum lines, check DPFE sensor.",
  },
  {
    code: "P0420",
    description:
      "Catalyst System Efficiency Below Threshold (Bank 1). The catalytic converter is operating below efficiency threshold, often indicates a failing or degraded converter.",
    systemType: "EMISSION" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Check for exhaust leaks before converter, test oxygen sensor operation, inspect catalytic converter for damage or clogging, verify engine misfire codes.",
  },
  {
    code: "P0480",
    description:
      "Cooling Fan 1 Control Circuit Malfunction. The ECM detects an electrical fault in the primary cooling fan circuit, risking engine overheating.",
    systemType: "COOLING" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Test cooling fan motor, inspect fan relay and fuses, check wiring harness, verify ECM fan control output.",
  },
  {
    code: "P0500",
    description:
      "Vehicle Speed Sensor (VSS) Circuit Malfunction. ECM cannot determine vehicle speed, affecting transmission shift points, cruise control, and speedometer.",
    systemType: "ELECTRICAL" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test VSS output signal, inspect sensor for damage, check wiring, verify transmission output shaft speed sensor operation.",
  },
  {
    code: "P0520",
    description:
      "Engine Oil Pressure Sensor Circuit Malfunction. ECM detects abnormal oil pressure sensor signal. Critical for engine lubrication monitoring.",
    systemType: "ENGINE" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Verify actual oil pressure with mechanical gauge, test oil pressure sensor, inspect wiring, check oil level and condition.",
  },
  {
    code: "P0562",
    description:
      "System Voltage Low. The ECM detects battery voltage below normal operating range, typically indicates charging system failure or excessive electrical load.",
    systemType: "ELECTRICAL" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Test battery voltage and condition, inspect alternator output, check charging system wiring, measure parasitic draw.",
  },
  {
    code: "P0563",
    description:
      "System Voltage High. The ECM detects battery voltage above normal range, caused by alternator overcharging which can damage electrical components.",
    systemType: "ELECTRICAL" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Test alternator voltage regulator, inspect for loose battery connections, check for voltage spikes, verify ground connections.",
  },
  {
    code: "P0606",
    description:
      "ECM/PCM Processor Fault. Internal engine control module processor error. Can cause various drivability issues and may require ECM replacement.",
    systemType: "ELECTRICAL" as const,
    severity: "CRITICAL" as const,
    recommendedAction:
      "Check ECM power and ground supplies, inspect for corrosion at ECM connectors, verify no water intrusion, reprogram or replace ECM if fault persists.",
  },
  {
    code: "P0622",
    description:
      "Generator Field Terminal 'F' Circuit Malfunction. Alternator field control circuit fault affects battery charging capability.",
    systemType: "ELECTRICAL" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test alternator field circuit, inspect voltage regulator, check alternator brushes and slip rings, verify wiring integrity.",
  },
  {
    code: "P0670",
    description:
      "Glow Plug Control Module Circuit Malfunction. Diesel engine glow plug system fault affects cold start performance.",
    systemType: "ENGINE" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test glow plug control module power and ground, inspect glow plug resistance, check control module communication.",
  },
  {
    code: "P068A",
    description:
      "ECM/PCM Power Relay De-Energized Too Early. The main relay that powers the ECM opens before expected, potentially causing incomplete shutdown or startup issues.",
    systemType: "ELECTRICAL" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test ECM power relay operation, inspect relay contacts for burning, check ECM Keep Alive Memory (KAM) power.",
  },
  {
    code: "P0700",
    description:
      "Transmission Control System Malfunction. The ECM has received a request from the TCM (Transmission Control Module) to illuminate the MIL due to a transmission fault.",
    systemType: "TRANSMISSION" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Scan TCM for specific transmission fault codes, check transmission fluid level and condition, inspect wiring between ECM and TCM.",
  },
  {
    code: "P0725",
    description:
      "Engine Speed Input Circuit Malfunction. The TCM loses engine RPM signal, affecting transmission shift timing and torque converter lockup.",
    systemType: "TRANSMISSION" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test engine speed sensor, inspect wiring to TCM, check for signal interference, verify CKP sensor operation.",
  },
  {
    code: "P0730",
    description:
      "Incorrect Gear Ratio. The TCM detects a gear ratio that doesn't match the expected value for the selected gear, indicating transmission slippage.",
    systemType: "TRANSMISSION" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Check transmission fluid level and condition, inspect for internal mechanical damage, test solenoid operation, perform pressure tests.",
  },
  {
    code: "P0740",
    description:
      "Torque Converter Clutch Circuit Malfunction. The TCM detects an electrical or mechanical fault in the torque converter clutch circuit, affecting fuel economy.",
    systemType: "TRANSMISSION" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test TCC solenoid resistance, inspect wiring, check torque converter operation, verify transmission fluid temperature sensor.",
  },
  {
    code: "P0842",
    description:
      "Transmission Fluid Pressure Sensor/Switch 'A' Circuit Low. Low voltage from the transmission fluid pressure sensor can indicate low fluid or sensor failure.",
    systemType: "TRANSMISSION" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Test transmission fluid pressure sensor, check actual fluid pressure, inspect wiring for shorts to ground, verify fluid level.",
  },
  {
    code: "P1000",
    description:
      "OBD System Readiness Test Not Complete. The ECM has not completed its self-monitoring drive cycle. Not a fault but indicates recent battery disconnect or code clearing.",
    systemType: "OTHER" as const,
    severity: "LOW" as const,
    recommendedAction:
      "Perform a complete OBD drive cycle to allow all system monitors to run. No repair needed unless accompanied by other codes.",
  },
  {
    code: "P1101",
    description:
      "Mass Air Flow (MAF) Sensor Out of Self-Test Range. The MAF sensor output during key-on engine-off self-test is outside expected parameters.",
    systemType: "ENGINE" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Clean MAF sensor, inspect for air leaks between MAF and throttle body, verify MAF sensor power and ground.",
  },
  {
    code: "P1297",
    description:
      "Turbocharger/Supercharger Boost Sensor 'A' Circuit Range/Performance. The ECM detects boost pressure outside expected range, affecting engine power output.",
    systemType: "ENGINE" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Inspect turbocharger for boost leaks, test boost pressure sensor, check wastegate operation, verify intercooler integrity.",
  },
  {
    code: "P132B",
    description:
      "Turbocharger/Supercharger Boost Control 'A' Performance. The boost control solenoid or actuator is not achieving the commanded boost pressure.",
    systemType: "ENGINE" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Test boost control solenoid, inspect vacuum lines to actuator, check turbocharger vane position (VGT), verify no boost leaks.",
  },
  {
    code: "P2002",
    description:
      "Diesel Particulate Filter (DPF) Efficiency Below Threshold (Bank 1). The DPF is not trapping sufficient particulate matter, often due to incomplete regeneration.",
    systemType: "EMISSION" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Perform forced DPF regeneration, inspect DPF pressure sensor readings, check for excessive soot loading, verify exhaust temperature sensors.",
  },
  {
    code: "U0100",
    description:
      "Lost Communication with ECM/PCM. The CAN bus network has lost communication with the engine control module, typically a wiring or module power issue.",
    systemType: "ELECTRICAL" as const,
    severity: "CRITICAL" as const,
    recommendedAction:
      "Check ECM power and ground circuits, inspect CAN bus wiring for shorts or opens, verify termination resistors, test other modules on the bus.",
  },
  {
    code: "U0121",
    description:
      "Lost Communication with Anti-Lock Brake System (ABS) Module. CAN bus communication failure with the ABS module. Affects stability control and braking systems.",
    systemType: "ABS" as const,
    severity: "HIGH" as const,
    recommendedAction:
      "Check ABS module power and ground, inspect CAN bus wiring, verify ABS module is operational, check for corrosion at module connector.",
  },
  {
    code: "U0140",
    description:
      "Lost Communication with Body Control Module (BCM). CAN bus communication failure with the BCM, affecting lighting, wipers, and accessories.",
    systemType: "ELECTRICAL" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Check BCM power and ground, inspect CAN bus termination, verify gateway module operation, test BCM internal power supply.",
  },
  {
    code: "U0155",
    description:
      "Lost Communication with Instrument Panel Cluster (IPC). CAN bus communication failure with the instrument cluster, affecting gauge display.",
    systemType: "ELECTRICAL" as const,
    severity: "MEDIUM" as const,
    recommendedAction:
      "Check IPC power and ground, inspect CAN bus wiring to cluster, verify cluster internal electronics, test for bus voltage.",
  },
];

const MAINTENANCE_TEMPLATES = [
  {
    name: "Oil Change",
    description: "Replace engine oil and oil filter. Includes inspection of oil condition and top-up if needed.",
    vehicleType: null,
    timeIntervalDays: 180,
    mileageIntervalKm: 10000,
    engineHoursInterval: 300,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 150,
    estimatedDuration: 1,
  },
  {
    name: "Oil Change (Heavy Duty)",
    description: "Replace engine oil and oil filter for heavy equipment. Synthetic oil recommended for extended intervals.",
    vehicleType: "TRACTOR" as const,
    timeIntervalDays: 180,
    mileageIntervalKm: 8000,
    engineHoursInterval: 250,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 250,
    estimatedDuration: 1.5,
  },
  {
    name: "Brake Inspection",
    description: "Inspect brake pads, rotors, calipers, and brake lines for wear and damage. Measure pad thickness and rotor runout.",
    vehicleType: null,
    timeIntervalDays: 90,
    mileageIntervalKm: 15000,
    engineHoursInterval: null,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 80,
    estimatedDuration: 1,
  },
  {
    name: "Tire Rotation & Inspection",
    description: "Rotate tires according to manufacturer pattern, inspect tread depth, check pressure, examine for uneven wear patterns.",
    vehicleType: null,
    timeIntervalDays: 120,
    mileageIntervalKm: 10000,
    engineHoursInterval: null,
    defaultSeverity: "LOW" as const,
    estimatedCost: 60,
    estimatedDuration: 0.75,
  },
  {
    name: "Transmission Service",
    description: "Replace transmission fluid and filter. Inspect transmission pan for debris, check for leaks, verify shift quality.",
    vehicleType: null,
    timeIntervalDays: 365,
    mileageIntervalKm: 50000,
    engineHoursInterval: 1000,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 350,
    estimatedDuration: 2.5,
  },
  {
    name: "Coolant Flush",
    description: "Drain and replace engine coolant. Inspect hoses, radiator, and water pump for leaks or wear. Test coolant concentration and pH.",
    vehicleType: null,
    timeIntervalDays: 365,
    mileageIntervalKm: 40000,
    engineHoursInterval: 800,
    defaultSeverity: "LOW" as const,
    estimatedCost: 200,
    estimatedDuration: 1.5,
  },
  {
    name: "Air Filter Replacement",
    description: "Replace engine air filter and cabin air filter. Inspect air intake system for contamination or damage.",
    vehicleType: null,
    timeIntervalDays: 180,
    mileageIntervalKm: 20000,
    engineHoursInterval: null,
    defaultSeverity: "LOW" as const,
    estimatedCost: 50,
    estimatedDuration: 0.5,
  },
  {
    name: "Fuel Filter Replacement",
    description: "Replace fuel filter. Drain water separator if equipped. Prime fuel system and check for leaks. Critical for diesel engines.",
    vehicleType: null,
    timeIntervalDays: 180,
    mileageIntervalKm: 15000,
    engineHoursInterval: 400,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 120,
    estimatedDuration: 1,
  },
  {
    name: "Battery Test & Service",
    description: "Test battery capacity and cold cranking amps. Clean terminals, check charging voltage, inspect cables and hold-downs.",
    vehicleType: null,
    timeIntervalDays: 90,
    mileageIntervalKm: null,
    engineHoursInterval: null,
    defaultSeverity: "LOW" as const,
    estimatedCost: 30,
    estimatedDuration: 0.5,
  },
  {
    name: "Annual DOT Inspection",
    description: "Comprehensive safety inspection per DOT regulations. Includes brakes, lights, tires, suspension, steering, frame, and coupling devices.",
    vehicleType: null,
    timeIntervalDays: 365,
    mileageIntervalKm: null,
    engineHoursInterval: null,
    defaultSeverity: "HIGH" as const,
    estimatedCost: 400,
    estimatedDuration: 3,
  },
  {
    name: "Hydraulic System Service",
    description: "Check hydraulic fluid level and condition. Inspect hoses, fittings, and cylinders for leaks. Replace hydraulic filter if applicable.",
    vehicleType: "TRACTOR" as const,
    timeIntervalDays: 180,
    mileageIntervalKm: null,
    engineHoursInterval: 500,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 180,
    estimatedDuration: 1.5,
  },
  {
    name: "DPF Regeneration Check",
    description: "Check diesel particulate filter soot loading. Perform forced regeneration if needed. Inspect exhaust temperature sensors and differential pressure sensor.",
    vehicleType: "TRUCK" as const,
    timeIntervalDays: 90,
    mileageIntervalKm: 20000,
    engineHoursInterval: 500,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 150,
    estimatedDuration: 1.5,
  },
  {
    name: "A/C System Service",
    description: "Inspect and service air conditioning system. Check refrigerant pressure, inspect condenser and evaporator, test compressor operation.",
    vehicleType: null,
    timeIntervalDays: 365,
    mileageIntervalKm: null,
    engineHoursInterval: null,
    defaultSeverity: "LOW" as const,
    estimatedCost: 180,
    estimatedDuration: 1.5,
  },
  {
    name: "Steering & Suspension Inspection",
    description: "Inspect tie rods, ball joints, control arms, shocks/struts, and steering gear for wear or damage. Check alignment if uneven tire wear is present.",
    vehicleType: null,
    timeIntervalDays: 180,
    mileageIntervalKm: 30000,
    engineHoursInterval: null,
    defaultSeverity: "HIGH" as const,
    estimatedCost: 100,
    estimatedDuration: 1.5,
  },
  {
    name: "Timing Belt/Chain Inspection",
    description: "Inspect timing belt/chain condition and tension. Replace per manufacturer interval. Critical — failure can cause catastrophic engine damage.",
    vehicleType: null,
    timeIntervalDays: 1095,
    mileageIntervalKm: 100000,
    engineHoursInterval: 2000,
    defaultSeverity: "HIGH" as const,
    estimatedCost: 600,
    estimatedDuration: 4,
  },
  {
    name: "Spark Plug Replacement",
    description: "Replace spark plugs. Inspect ignition coils and boots. Check gap and torque to specification.",
    vehicleType: "CAR" as const,
    timeIntervalDays: 365,
    mileageIntervalKm: 30000,
    engineHoursInterval: null,
    defaultSeverity: "LOW" as const,
    estimatedCost: 120,
    estimatedDuration: 1,
  },
  {
    name: "Glow Plug Test (Diesel)",
    description: "Test all glow plugs for resistance. Replace failed glow plugs. Check glow plug control module and relay operation.",
    vehicleType: "TRUCK" as const,
    timeIntervalDays: 365,
    mileageIntervalKm: 30000,
    engineHoursInterval: 600,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 200,
    estimatedDuration: 1.5,
  },
  {
    name: "Wheel Bearing Inspection & Repack",
    description: "Inspect wheel bearings for play or noise. Clean and repack with fresh grease. Replace if worn or damaged.",
    vehicleType: "TRACTOR" as const,
    timeIntervalDays: 180,
    mileageIntervalKm: 25000,
    engineHoursInterval: null,
    defaultSeverity: "HIGH" as const,
    estimatedCost: 200,
    estimatedDuration: 2,
  },
  {
    name: "PTO (Power Take-Off) Service",
    description: "Inspect PTO shaft, universal joints, and clutch engagement. Lubricate and check for excessive wear or vibration.",
    vehicleType: "TRACTOR" as const,
    timeIntervalDays: 180,
    mileageIntervalKm: null,
    engineHoursInterval: 500,
    defaultSeverity: "MEDIUM" as const,
    estimatedCost: 150,
    estimatedDuration: 1,
  },
];

async function main() {
  console.log("🌱 Seeding fault_code_definitions...");

  for (const fault of FAULT_CODES) {
    await prisma.fault_code_definitions.upsert({
      where: { code: fault.code },
      update: {
        description: fault.description,
        systemType: fault.systemType,
        severity: fault.severity,
        recommendedAction: fault.recommendedAction,
      },
      create: fault,
    });
  }

  console.log(`  ✓ ${FAULT_CODES.length} fault codes seeded`);

  // Seed maintenance templates for the first company (or create
  // them without company scope for now — templates can be
  // assigned to specific companies later via the UI)
  console.log("🌱 Seeding maintenance_templates...");

  const companies = await prisma.companies.findMany({ take: 1 });
  if (companies.length === 0) {
    console.log("  ⚠ No companies found — skipping template seeding");
    console.log("  → Run this seed again after creating a company");
    return;
  }

  const companyId = companies[0].id;

  for (const tmpl of MAINTENANCE_TEMPLATES) {
    const identifier = `${companyId}_${tmpl.name}_${tmpl.vehicleType ?? "GLOBAL"}`;

    const existing = await prisma.maintenance_template.findFirst({
      where: {
        companyId,
        name: tmpl.name,
        vehicleType: tmpl.vehicleType ?? undefined,
      },
    });

    if (!existing) {
      await prisma.maintenance_template.create({
        data: {
          companyId,
          ...tmpl,
        },
      });
    }
  }

  console.log(`  ✓ ${MAINTENANCE_TEMPLATES.length} templates seeded`);

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });