/**
 * Export Service - PDF/Excel Export Functionality
 * 
 * This service provides comprehensive export capabilities for
 * dashboard data, charts, and reports in multiple formats.
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { DashboardData } from "@/lib/services/dashboardService";
import type { RiskItem } from "@/types/domain";

export type ExportFormat = "pdf" | "excel" | "csv" | "png" | "svg";
export type ExportType = "dashboard" | "risks" | "budget" | "timeline" | "chart";

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  filename?: string;
  includeCharts?: boolean;
  includeData?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportData {
  dashboard?: DashboardData;
  risks?: RiskItem[];
  budget?: Array<{ category: string; amount: number; type: string }>;
  timeline?: Array<{ task: string; start: Date; duration: number; status: string }>;
  metadata?: {
    exportDate: Date;
    projectId?: string;
    userId?: string;
    version: string;
  };
}

/**
 * Main export function - handles all export types and formats
 */
export async function exportData(
  data: ExportData,
  options: ExportOptions
): Promise<void> {
  const filename = options.filename || generateFilename(options.type, options.format);
  
  try {
    console.log(`📊 Exporting ${options.type} as ${options.format}...`);

    switch (options.format) {
      case "pdf":
        await exportToPDF(data, options, filename);
        break;
      case "excel":
        await exportToExcel(data, options, filename);
        break;
      case "csv":
        await exportToCSV(data, options, filename);
        break;
      case "png":
        await exportToPNG(options.type, filename);
        break;
      case "svg":
        await exportToSVG(options.type, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    console.log(`✅ Export completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Export failed:`, error);
    throw new Error(`Failed to export ${options.type} as ${options.format}`);
  }
}

/**
 * Export dashboard to PDF
 */
async function exportToPDF(
  data: ExportData,
  options: ExportOptions,
  filename: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Add header
  pdf.setFontSize(20);
  pdf.text("Finance Planner Report", 20, 30);
  
  pdf.setFontSize(12);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
  
  let yPosition = 60;

  // Dashboard Summary
  if (data.dashboard && options.type === "dashboard") {
    pdf.setFontSize(16);
    pdf.text("Dashboard Summary", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    const dashboardText = [
      `Company: ${data.dashboard.companyName || "N/A"}`,
      `Size: ${data.dashboard.companySize || "N/A"}`,
      `CAPEX: $${data.dashboard.capex.toLocaleString()}`,
      `OPEX: $${data.dashboard.opex.toLocaleString()}`,
      `Timeline: ${data.dashboard.timeline} days`,
      `Projected Savings: $${data.dashboard.savings.toLocaleString()}`
    ];

    dashboardText.forEach(text => {
      pdf.text(text, 20, yPosition);
      yPosition += 8;
    });

    yPosition += 10;
  }

  // Risks Section
  if (data.risks && data.risks.length > 0) {
    pdf.setFontSize(16);
    pdf.text("Risk Analysis", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    data.risks.slice(0, 10).forEach((risk, index) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.text(`${index + 1}. ${risk.title}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`   Likelihood: ${formatLikelihood(risk.likelihood)} | Impact: ${formatImpact(risk.impact)} | Score: ${Math.round(risk.score * 100)}%`, 25, yPosition);
      yPosition += 6;
      
      if (risk.mitigation) {
        const mitigationLines = pdf.splitTextToSize(`   Mitigation: ${risk.mitigation}`, 160);
        pdf.text(mitigationLines, 25, yPosition);
        yPosition += mitigationLines.length * 6;
      }
      
      yPosition += 4;
    });
  }

  // Budget Section
  if (data.budget && data.budget.length > 0) {
    if (yPosition > 200) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(16);
    pdf.text("Budget Breakdown", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    data.budget.forEach(item => {
      pdf.text(`${item.category}: $${item.amount.toLocaleString()} (${item.type})`, 20, yPosition);
      yPosition += 8;
    });
  }

  // Include charts if requested
  if (options.includeCharts) {
    await addChartsToPDF(pdf, options.type);
  }

  // Save the PDF
  pdf.save(filename);
}

/**
 * Export data to Excel
 */
async function exportToExcel(
  data: ExportData,
  options: ExportOptions,
  filename: string
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Dashboard sheet
  if (data.dashboard) {
    const dashboardData = [
      ["Metric", "Value"],
      ["Company", data.dashboard.companyName || "N/A"],
      ["Size", data.dashboard.companySize || "N/A"],
      ["CAPEX", data.dashboard.capex],
      ["OPEX (Monthly)", data.dashboard.opex],
      ["Timeline (Days)", data.dashboard.timeline],
      ["Projected Savings", data.dashboard.savings],
      ["Export Date", new Date().toISOString()]
    ];

    const dashboardSheet = XLSX.utils.aoa_to_sheet(dashboardData);
    XLSX.utils.book_append_sheet(workbook, dashboardSheet, "Dashboard");
  }

  // Risks sheet
  if (data.risks && data.risks.length > 0) {
    const risksData = [
      ["Title", "Likelihood", "Impact", "Score", "Mitigation", "Created Date"],
      ...data.risks.map(risk => [
        risk.title,
        risk.likelihood,
        risk.impact,
        risk.score,
        risk.mitigation || "",
        risk.createdAt
      ])
    ];

    const risksSheet = XLSX.utils.aoa_to_sheet(risksData);
    XLSX.utils.book_append_sheet(workbook, risksSheet, "Risks");
  }

  // Budget sheet
  if (data.budget && data.budget.length > 0) {
    const budgetData = [
      ["Category", "Amount", "Type"],
      ...data.budget.map(item => [
        item.category,
        item.amount,
        item.type
      ])
    ];

    const budgetSheet = XLSX.utils.aoa_to_sheet(budgetData);
    XLSX.utils.book_append_sheet(workbook, budgetSheet, "Budget");
  }

  // Timeline sheet
  if (data.timeline && data.timeline.length > 0) {
    const timelineData = [
      ["Task", "Start Date", "Duration (Days)", "Status"],
      ...data.timeline.map(item => [
        item.task,
        item.start.toISOString(),
        item.duration,
        item.status
      ])
    ];

    const timelineSheet = XLSX.utils.aoa_to_sheet(timelineData);
    XLSX.utils.book_append_sheet(workbook, timelineSheet, "Timeline");
  }

  // Write and save the file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}

/**
 * Export data to CSV
 */
async function exportToCSV(
  data: ExportData,
  options: ExportOptions,
  filename: string
): Promise<void> {
  let csvContent = "";

  if (options.type === "risks" && data.risks) {
    csvContent = "Title,Likelihood,Impact,Score,Mitigation,Created Date\n";
    csvContent += data.risks.map(risk => 
      `"${risk.title}",${risk.likelihood},${risk.impact},${risk.score},"${risk.mitigation || ""}","${risk.createdAt}"`
    ).join("\n");
  } else if (options.type === "budget" && data.budget) {
    csvContent = "Category,Amount,Type\n";
    csvContent += data.budget.map(item => 
      `"${item.category}",${item.amount},"${item.type}"`
    ).join("\n");
  } else if (options.type === "timeline" && data.timeline) {
    csvContent = "Task,Start Date,Duration (Days),Status\n";
    csvContent += data.timeline.map(item => 
      `"${item.task}","${item.start.toISOString()}",${item.duration},"${item.status}"`
    ).join("\n");
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, filename);
}

/**
 * Export chart as PNG
 */
async function exportToPNG(type: ExportType, filename: string): Promise<void> {
  const chartElement = document.querySelector(`[data-chart-type="${type}"]`) as HTMLElement;
  
  if (!chartElement) {
    throw new Error(`Chart element not found for type: ${type}`);
  }

  const canvas = await html2canvas(chartElement, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true
  });

  canvas.toBlob((blob) => {
    if (blob) {
      saveAs(blob, filename);
    }
  }, "image/png");
}

/**
 * Export chart as SVG
 */
async function exportToSVG(type: ExportType, filename: string): Promise<void> {
  const svgElement = document.querySelector(`[data-chart-type="${type}"] svg`) as SVGElement;
  
  if (!svgElement) {
    throw new Error(`SVG element not found for type: ${type}`);
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  saveAs(svgBlob, filename);
}

/**
 * Add charts to PDF (placeholder implementation)
 */
async function addChartsToPDF(pdf: jsPDF, type: ExportType): Promise<void> {
  // This would capture chart elements and add them to the PDF
  // Implementation would depend on the specific chart library being used
  console.log(`Adding ${type} charts to PDF...`);
  
  // For now, add a placeholder
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.text("Charts", 20, 30);
  pdf.setFontSize(12);
  pdf.text("Chart images would be embedded here", 20, 50);
}

/**
 * Generate filename based on type and format
 */
function generateFilename(type: ExportType, format: ExportFormat): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const extension = format === "excel" ? "xlsx" : format;
  return `finance-planner-${type}-${timestamp}.${extension}`;
}

/**
 * Format likelihood for display
 */
function formatLikelihood(likelihood: number): string {
  if (likelihood >= 0.7) return "High";
  if (likelihood >= 0.4) return "Medium";
  return "Low";
}

/**
 * Format impact for display
 */
function formatImpact(impact: number): string {
  if (impact >= 0.7) return "High";
  if (impact >= 0.4) return "Medium";
  return "Low";
}

/**
 * Utility function to export dashboard summary
 */
export async function exportDashboardSummary(
  dashboardData: DashboardData,
  risks: RiskItem[],
  format: ExportFormat = "pdf"
): Promise<void> {
  const data: ExportData = {
    dashboard: dashboardData,
    risks: risks,
    metadata: {
      exportDate: new Date(),
      projectId: dashboardData.projectId,
      version: "1.0.0"
    }
  };

  await exportData(data, {
    format,
    type: "dashboard",
    includeCharts: true,
    includeData: true
  });
}

/**
 * Utility function to export risks only
 */
export async function exportRisks(
  risks: RiskItem[],
  format: ExportFormat = "excel"
): Promise<void> {
  const data: ExportData = {
    risks,
    metadata: {
      exportDate: new Date(),
      version: "1.0.0"
    }
  };

  await exportData(data, {
    format,
    type: "risks",
    includeData: true
  });
}
