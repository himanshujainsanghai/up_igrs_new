import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as reportsService from '../services/reports.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Reports Controller
 * Handles report generation and export requests
 */

/**
 * GET /api/v1/reports/statistics
 * Get comprehensive report statistics
 */
export const getReportStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      throw new ValidationError('Invalid start_date format');
    }

    if (endDate && isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid end_date format');
    }

    const statistics = await reportsService.getReportStatistics(startDate, endDate);
    sendSuccess(res, statistics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/pdf
 * Generate PDF report (returns HTML that can be converted to PDF)
 */
export const generatePDFReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    const html = await reportsService.generatePDFReport(startDate, endDate);

    // Return HTML that can be converted to PDF by frontend or PDF service
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/excel
 * Generate Excel-compatible CSV export
 */
export const generateExcelExport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { start_date, end_date, status, category, priority } = req.query;

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    const csvData = await reportsService.generateCSVData(startDate, endDate, {
      status: status as string,
      category: category as string,
      priority: priority as string,
    });

    // Set headers for CSV download
    const filename = `complaints_report_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/complaints/export
 * Get complaints data for export (JSON format)
 */
export const exportComplaints = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { start_date, end_date, status, category, priority } = req.query;

    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    const data = await reportsService.getComplaintsForExport(startDate, endDate, {
      status: status as string,
      category: category as string,
      priority: priority as string,
    });

    sendSuccess(res, {
      data,
      count: data.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

