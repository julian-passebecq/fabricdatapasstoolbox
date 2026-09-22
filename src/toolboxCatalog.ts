export type ToolUi = "Existing UI" | "Datapass UI" | "CLI / Script";

export interface PrimaryToolDefinition {
  id: "fabricStudio" | "migration" | "assessment" | "security" | "mcp";
  name: string;
  description: string;
  ui: ToolUi;
  url?: string;
}

export interface CatalogItemDefinition {
  id: string;
  name: string;
  category: "Monitoring" | "Operations" | "Migration" | "BI" | "Real-time" | "Development";
  surface: "Report / dashboard" | "Accelerator" | "Tool / script" | "MCP server";
  url: string;
}

const toolboxBase = "https://github.com/microsoft/fabric-toolbox/tree/main";

export const PRIMARY_TOOLS: PrimaryToolDefinition[] = [
  {
    id: "fabricStudio",
    name: "FabricStudio",
    description: "Mature VS Code UI for Fabric workspace power-user, deployment, connection, capacity and admin workflows.",
    ui: "Existing UI"
  },
  {
    id: "migration",
    name: "Data Factory Migration Assistant",
    description: "Existing React wizard for ADF/Synapse to Fabric migration. Datapass links to it instead of rebuilding it.",
    ui: "Existing UI",
    url: `${toolboxBase}/tools/FabricDataFactoryMigrationAssistant`
  },
  {
    id: "assessment",
    name: "Fabric Assessment Tool",
    description: "Migration inventory and readiness assessment. Datapass supplies a small guided command UI around the existing CLI.",
    ui: "Datapass UI",
    url: `${toolboxBase}/tools/fabric-assessment-tool`
  },
  {
    id: "security",
    name: "Fabric Security Audit",
    description: "Guided front end for the existing PowerShell security troubleshooter in Microsoft Fabric Toolbox.",
    ui: "Datapass UI",
    url: `${toolboxBase}/tools/fabric-security-audit`
  },
  {
    id: "mcp",
    name: "MCP",
    description: "Optional workspace configuration/status. Datapass keeps MCP visible without making the Fabric workflow depend on it.",
    ui: "Datapass UI"
  }
];

export const CURATED_TOOLBOX_ITEMS: CatalogItemDefinition[] = [
  {
    id: "costMonitoring",
    name: "Fabric Cost Analysis",
    category: "Monitoring",
    surface: "Report / dashboard",
    url: `${toolboxBase}/monitoring/fabric-cost-analysis`
  },
  {
    id: "platformMonitoring",
    name: "Fabric Platform Monitoring",
    category: "Monitoring",
    surface: "Report / dashboard",
    url: `${toolboxBase}/monitoring/fabric-platform-monitoring`
  },
  {
    id: "sparkMonitoring",
    name: "Fabric Spark Monitoring",
    category: "Monitoring",
    surface: "Report / dashboard",
    url: `${toolboxBase}/monitoring/fabric-spark-monitoring`
  },
  {
    id: "adminMonitoring",
    name: "Unified Admin Monitoring",
    category: "Monitoring",
    surface: "Report / dashboard",
    url: `${toolboxBase}/monitoring/fabric-unified-admin-monitoring`
  },
  {
    id: "workspaceMonitoring",
    name: "Workspace Monitoring Dashboards",
    category: "Monitoring",
    surface: "Report / dashboard",
    url: `${toolboxBase}/monitoring/workspace-monitoring-dashboards`
  },
  {
    id: "capacityCorrelation",
    name: "Query / Capacity Correlation",
    category: "Monitoring",
    surface: "Tool / script",
    url: `${toolboxBase}/monitoring/query-capacity-correlation`
  },
  {
    id: "cicd",
    name: "Fabric CI/CD Accelerators",
    category: "Operations",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/CICD`
  },
  {
    id: "bcdr",
    name: "Business Continuity / DR",
    category: "Operations",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/BCDR`
  },
  {
    id: "warehouseBackup",
    name: "Warehouse Backup and Recovery",
    category: "Operations",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/data-warehouse-backup-and-recovery`
  },
  {
    id: "policyWeaver",
    name: "Policy Weaver",
    category: "Operations",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/policy-weaver`
  },
  {
    id: "dfg2Migration",
    name: "Dataflow Gen2 Migration Accelerator",
    category: "Migration",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/DFG2-migration-accelerator`
  },
  {
    id: "powerBiWarehouseModernization",
    name: "Power BI to Fabric Warehouse Modernization",
    category: "Migration",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/power-bi-to-fabric-data-warehouse-modernization`
  },
  {
    id: "gen2Warehouse",
    name: "Gen2 to Fabric DW",
    category: "Migration",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/Gen2toFabricDW`
  },
  {
    id: "lineage",
    name: "Lineage Extractor",
    category: "Development",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/Lineage_Extractor`
  },
  {
    id: "fabricMgmt",
    name: "Microsoft Fabric Management",
    category: "Development",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/MicrosoftFabricMgmt`
  },
  {
    id: "fabricMgmtMcp",
    name: "Microsoft Fabric Management MCP",
    category: "Development",
    surface: "MCP server",
    url: `${toolboxBase}/tools/MicrosoftFabricMgmtMCPServer`
  },
  {
    id: "loadTest",
    name: "Fabric Load Test Tool",
    category: "Development",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/FabricLoadTestTool`
  },
  {
    id: "openMirroringSdk",
    name: "Open Mirroring Python SDK",
    category: "Development",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/OpenMirroringPythonSDK`
  },
  {
    id: "copyWarehouse",
    name: "Copy Warehouse",
    category: "Development",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/copy-warehouse`
  },
  {
    id: "tpch",
    name: "TPC-H Benchmarking",
    category: "Development",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/tpch-benchmarking`
  },
  {
    id: "semanticAudit",
    name: "Semantic Model Audit",
    category: "BI",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/SemanticModelAudit`
  },
  {
    id: "semanticMcp",
    name: "Semantic Model MCP",
    category: "BI",
    surface: "MCP server",
    url: `${toolboxBase}/tools/SemanticModelMCPServer`
  },
  {
    id: "daxTesting",
    name: "DAX Performance Testing",
    category: "BI",
    surface: "Tool / script",
    url: `${toolboxBase}/tools/DAXPerformanceTesting`
  },
  {
    id: "daxMcp",
    name: "DAX Performance Tuner MCP",
    category: "BI",
    surface: "MCP server",
    url: `${toolboxBase}/tools/DAXPerformanceTunerMCPServer`
  },
  {
    id: "rtiEventstream",
    name: "Real-Time Intelligence Eventstream",
    category: "Real-time",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/real-time-intelligence_eventstream`
  },
  {
    id: "rtiEventhouse",
    name: "Real-Time Intelligence Eventhouse",
    category: "Real-time",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/real-time-intelligence_eventhouse`
  },
  {
    id: "mirrorLakehouse",
    name: "Mirror Lakehouse",
    category: "Real-time",
    surface: "Accelerator",
    url: `${toolboxBase}/accelerators/mirror-lakehouse`
  }
];

export function findToolUrl(id: string): string | undefined {
  return PRIMARY_TOOLS.find(tool => tool.id === id)?.url ??
    CURATED_TOOLBOX_ITEMS.find(tool => tool.id === id)?.url;
}
