/**
 * Reports Service
 * Handles report generation, statistics, and exports (PDF/Excel)
 */

import { Complaint } from '../models/Complaint';
import { Meeting } from '../models/Meeting';
import { Feedback } from '../models/Feedback';
import logger from '../config/logger';

/**
 * Get comprehensive statistics for reports
 */
export interface ReportStatistics {
  complaints: {
    total: number;
    by_status: {
      pending: number;
      in_progress: number;
      resolved: number;
      rejected: number;
    };
    by_priority: {
      low: number;
      medium: number;
      high: number;
      urgent: number;
    };
    by_category: Array<{
      category: string;
      count: number;
    }>;
    resolved_this_month: number;
    average_resolution_days: number;
  };
  meetings: {
    total: number;
    by_status: {
      pending: number;
      approved: number;
      rejected: number;
      completed: number;
    };
    upcoming: number;
  };
  feedback: {
    total: number;
    by_type: {
      suggestion: number;
      praise: number;
      issue: number;
    };
    pending_review: number;
  };
  time_range: {
    start_date: Date;
    end_date: Date;
  };
}

export const getReportStatistics = async (
  startDate?: Date,
  endDate?: Date
): Promise<ReportStatistics> => {
  try {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();

    // Build date filter
    const dateFilter = {
      created_at: {
        $gte: start,
        $lte: end,
      },
    };

    // Complaints statistics
    const [
      totalComplaints,
      complaintsByStatus,
      complaintsByPriority,
      complaintsByCategory,
      resolvedThisMonth,
      resolvedComplaints,
    ] = await Promise.all([
      Complaint.countDocuments(dateFilter),
      Complaint.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Complaint.countDocuments({
        status: 'resolved',
        actual_resolution_date: {
          $gte: new Date(new Date().setDate(1)),
          $lte: end,
        },
      }),
      Complaint.find({
        status: 'resolved',
        actual_resolution_date: { $exists: true, $ne: null },
        ...dateFilter,
      }).lean(),
    ]);

    // Calculate average resolution days
    let averageResolutionDays = 0;
    if (resolvedComplaints.length > 0) {
      const totalDays = resolvedComplaints.reduce((sum, complaint: any) => {
        if (complaint.actual_resolution_date && complaint.created_at) {
          const days = Math.ceil(
            (new Date(complaint.actual_resolution_date).getTime() -
              new Date(complaint.created_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }
        return sum;
      }, 0);
      averageResolutionDays = Math.round(totalDays / resolvedComplaints.length);
    }

    // Meetings statistics
    const [
      totalMeetings,
      meetingsByStatus,
      upcomingMeetings,
    ] = await Promise.all([
      Meeting.countDocuments(dateFilter),
      Meeting.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Meeting.countDocuments({
        status: 'approved',
        preferred_date: { $gte: new Date() },
      }),
    ]);

    // Feedback statistics
    const [
      totalFeedback,
      feedbackByType,
      pendingFeedback,
    ] = await Promise.all([
      Feedback.countDocuments(dateFilter),
      Feedback.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Feedback.countDocuments({
        status: 'pending',
        ...dateFilter,
      }),
    ]);

    // Format status counts
    const statusMap = complaintsByStatus.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const priorityMap = complaintsByPriority.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const meetingStatusMap = meetingsByStatus.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const feedbackTypeMap = feedbackByType.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      complaints: {
        total: totalComplaints,
        by_status: {
          pending: statusMap.pending || 0,
          in_progress: statusMap.in_progress || 0,
          resolved: statusMap.resolved || 0,
          rejected: statusMap.rejected || 0,
        },
        by_priority: {
          low: priorityMap.low || 0,
          medium: priorityMap.medium || 0,
          high: priorityMap.high || 0,
          urgent: priorityMap.urgent || 0,
        },
        by_category: complaintsByCategory.map((item: any) => ({
          category: item._id,
          count: item.count,
        })),
        resolved_this_month: resolvedThisMonth,
        average_resolution_days: averageResolutionDays,
      },
      meetings: {
        total: totalMeetings,
        by_status: {
          pending: meetingStatusMap.pending || 0,
          approved: meetingStatusMap.approved || 0,
          rejected: meetingStatusMap.rejected || 0,
          completed: meetingStatusMap.completed || 0,
        },
        upcoming: upcomingMeetings,
      },
      feedback: {
        total: totalFeedback,
        by_type: {
          suggestion: feedbackTypeMap.suggestion || 0,
          praise: feedbackTypeMap.praise || 0,
          issue: feedbackTypeMap.issue || 0,
        },
        pending_review: pendingFeedback,
      },
      time_range: {
        start_date: start,
        end_date: end,
      },
    };
  } catch (error) {
    logger.error('Error generating report statistics:', error);
    throw error;
  }
};

/**
 * Get complaints data for export
 */
export const getComplaintsForExport = async (
  startDate?: Date,
  endDate?: Date,
  filters?: {
    status?: string;
    category?: string;
    priority?: string;
  }
) => {
  try {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate || new Date();

    const query: any = {
      created_at: {
        $gte: start,
        $lte: end,
      },
    };

    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters?.category && filters.category !== 'all') {
      query.category = filters.category;
    }

    if (filters?.priority && filters.priority !== 'all') {
      query.priority = filters.priority;
    }

    const complaints = await Complaint.find(query)
      .sort({ created_at: -1 })
      .lean();

    return complaints.map((complaint: any) => ({
      'Complaint ID': complaint.complaint_id || complaint.id,
      'Title': complaint.title,
      'Category': complaint.category,
      'Status': complaint.status,
      'Priority': complaint.priority,
      'Contact Name': complaint.contact_name,
      'Contact Email': complaint.contact_email,
      'Contact Phone': complaint.contact_phone || '',
      'Location': complaint.location || '',
      'Description': complaint.description,
      'Created Date': complaint.created_at ? new Date(complaint.created_at).toLocaleDateString('en-IN') : '',
      'Resolved Date': complaint.actual_resolution_date ? new Date(complaint.actual_resolution_date).toLocaleDateString('en-IN') : '',
      'Resolution Notes': complaint.resolution_notes || '',
    }));
  } catch (error) {
    logger.error('Error getting complaints for export:', error);
    throw error;
  }
};

/**
 * Generate PDF report
 * Returns HTML content that can be converted to PDF
 */
export const generatePDFReport = async (
  startDate?: Date,
  endDate?: Date
): Promise<string> => {
  try {
    const statistics = await getReportStatistics(startDate, endDate);

    // Generate HTML content for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Complaint Management Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #2563eb;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .stat-box {
      display: inline-block;
      padding: 15px 25px;
      margin: 10px;
      background-color: #f0f9ff;
      border-left: 4px solid #2563eb;
      border-radius: 4px;
    }
    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .stat-label {
      font-size: 14px;
      color: #64748b;
    }
    .date-range {
      color: #64748b;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>Complaint Management System - Report</h1>
  <div class="date-range">
    <strong>Report Period:</strong> ${new Date(statistics.time_range.start_date).toLocaleDateString('en-IN')} 
    to ${new Date(statistics.time_range.end_date).toLocaleDateString('en-IN')}
  </div>

  <h2>Complaints Overview</h2>
  <div>
    <div class="stat-box">
      <div class="stat-number">${statistics.complaints.total}</div>
      <div class="stat-label">Total Complaints</div>
    </div>
    <div class="stat-box">
      <div class="stat-number">${statistics.complaints.resolved_this_month}</div>
      <div class="stat-label">Resolved This Month</div>
    </div>
    <div class="stat-box">
      <div class="stat-number">${statistics.complaints.average_resolution_days}</div>
      <div class="stat-label">Avg Resolution Days</div>
    </div>
  </div>

  <h3>Complaints by Status</h3>
  <table>
    <tr>
      <th>Status</th>
      <th>Count</th>
    </tr>
    <tr>
      <td>Pending</td>
      <td>${statistics.complaints.by_status.pending}</td>
    </tr>
    <tr>
      <td>In Progress</td>
      <td>${statistics.complaints.by_status.in_progress}</td>
    </tr>
    <tr>
      <td>Resolved</td>
      <td>${statistics.complaints.by_status.resolved}</td>
    </tr>
    <tr>
      <td>Rejected</td>
      <td>${statistics.complaints.by_status.rejected}</td>
    </tr>
  </table>

  <h3>Complaints by Priority</h3>
  <table>
    <tr>
      <th>Priority</th>
      <th>Count</th>
    </tr>
    <tr>
      <td>Low</td>
      <td>${statistics.complaints.by_priority.low}</td>
    </tr>
    <tr>
      <td>Medium</td>
      <td>${statistics.complaints.by_priority.medium}</td>
    </tr>
    <tr>
      <td>High</td>
      <td>${statistics.complaints.by_priority.high}</td>
    </tr>
    <tr>
      <td>Urgent</td>
      <td>${statistics.complaints.by_priority.urgent}</td>
    </tr>
  </table>

  <h3>Complaints by Category</h3>
  <table>
    <tr>
      <th>Category</th>
      <th>Count</th>
    </tr>
    ${statistics.complaints.by_category
      .map(
        (item) => `
    <tr>
      <td>${item.category}</td>
      <td>${item.count}</td>
    </tr>
    `
      )
      .join('')}
  </table>

  <h2>Meetings Overview</h2>
  <div>
    <div class="stat-box">
      <div class="stat-number">${statistics.meetings.total}</div>
      <div class="stat-label">Total Meetings</div>
    </div>
    <div class="stat-box">
      <div class="stat-number">${statistics.meetings.upcoming}</div>
      <div class="stat-label">Upcoming</div>
    </div>
  </div>

  <h2>Feedback Overview</h2>
  <div>
    <div class="stat-box">
      <div class="stat-number">${statistics.feedback.total}</div>
      <div class="stat-label">Total Feedback</div>
    </div>
    <div class="stat-box">
      <div class="stat-number">${statistics.feedback.pending_review}</div>
      <div class="stat-label">Pending Review</div>
    </div>
  </div>

  <div style="margin-top: 40px; text-align: center; color: #64748b;">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
  </div>
</body>
</html>
    `.trim();

    return html;
  } catch (error) {
    logger.error('Error generating PDF report:', error);
    throw error;
  }
};

/**
 * Generate Excel-compatible CSV data
 */
export const generateCSVData = async (
  startDate?: Date,
  endDate?: Date,
  filters?: {
    status?: string;
    category?: string;
    priority?: string;
  }
): Promise<string> => {
  try {
    const data = await getComplaintsForExport(startDate, endDate, filters);

    if (data.length === 0) {
      return '';
    }

    // Get headers from first row
    const headers = Object.keys(data[0]);

    // Generate CSV
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header as keyof typeof row];
        // Escape commas and quotes in values
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  } catch (error) {
    logger.error('Error generating CSV data:', error);
    throw error;
  }
};

export default {
  getReportStatistics,
  getComplaintsForExport,
  generatePDFReport,
  generateCSVData,
};

