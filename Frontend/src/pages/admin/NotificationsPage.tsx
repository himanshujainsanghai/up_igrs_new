/**
 * Admin Notifications Page
 * All notifications for the current admin; grouped by complaint and event type.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  notificationsService,
  type NotificationItem,
} from "@/services/notifications.service";
import { Bell, CheckCheck, FileText, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const EVENT_TYPE_LABELS: Record<string, string> = {
  complaint_created: "New complaint",
  officer_assigned: "Officer assigned",
  officer_reassigned: "Officer reassigned",
  officer_unassigned: "Officer unassigned",
  extension_requested: "Extension requested",
  extension_approved: "Extension approved",
  extension_rejected: "Extension rejected",
  complaint_closed: "Complaint closed",
  note_added: "Note added",
  document_added: "Document added",
  officer_note_added: "Officer note added",
  officer_document_added: "Officer document added",
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsService.listNotifications({
        unread_only: unreadOnly,
        limit: 100,
        skip: 0,
      });
      setNotifications(res.notifications);
      setTotal(res.total);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
      setNotifications([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id);
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    } catch (e) {
      console.error("Failed to mark as read", e);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      fetchNotifications();
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const groupedByComplaint = notifications.reduce<
    Record<string, NotificationItem[]>
  >((acc, n) => {
    const key = n.complaint_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All notifications grouped by complaint
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            Unread only
          </Button>
          {notifications.some((n) => !n.read_at) && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Card className="border-orange-200">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="border-orange-200">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByComplaint).map(([complaintId, items]) => (
            <Card
              key={complaintId}
              className="border-orange-200 overflow-hidden transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Complaint {complaintId}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/complaints/${complaintId}`)}
                  >
                    View complaint
                  </Button>
                </div>
                <CardDescription>
                  {items.length} notification{items.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg p-3 border bg-card",
                      !n.read_at && "bg-orange-50/50 border-orange-200"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{n.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          {EVENT_TYPE_LABELS[n.event_type] ?? n.event_type}
                        </Badge>
                        {!n.read_at && (
                          <Badge variant="default" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      {n.body && (
                        <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">
                          {n.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!n.read_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={markingId === n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                      >
                        {markingId === n.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Mark read"
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
