/**
 * Settings Page
 * Includes Notification Control Panel (admin): which events trigger notifications.
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Settings, User, Bell, Shield, Loader2 } from "lucide-react";
import {
  notificationsService,
  type NotificationSettingsItem,
} from "@/services/notifications.service";

const EVENT_TYPE_LABELS: Record<string, string> = {
  complaint_created: "New complaint created",
  officer_assigned: "Officer assigned",
  officer_reassigned: "Officer reassigned",
  officer_unassigned: "Officer unassigned",
  extension_requested: "Extension requested",
  extension_approved: "Extension approved",
  extension_rejected: "Extension rejected",
  complaint_closed: "Complaint closed",
  note_added: "Admin note added",
  document_added: "Admin document added",
  officer_note_added: "Officer note added",
  officer_document_added: "Officer document added",
};

const SettingsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState<
    NotificationSettingsItem[]
  >([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setSettingsLoading(false);
      return;
    }
    let cancelled = false;
    notificationsService
      .getNotificationSettings()
      .then((settings) => {
        if (!cancelled) setNotificationSettings(settings);
      })
      .catch((e) => console.error("Failed to load notification settings", e))
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and system settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Settings
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user?.name || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user?.email || ""}
                disabled
              />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>
              Change your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>

        {/* Notification Control Panel (admin only) */}
        {isAdmin && (
          <Card className="border-orange-200 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification control
              </CardTitle>
              <CardDescription>
                Turn on/off which events trigger in-app notifications for admins
                and officers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {notificationSettings.map((s) => (
                    <div
                      key={s.event_type}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <Label
                        htmlFor={`notif-${s.event_type}`}
                        className="flex-1 cursor-pointer"
                      >
                        {EVENT_TYPE_LABELS[s.event_type] ?? s.event_type}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {s.enabled ? "On" : "Off"}
                        </span>
                        <button
                          id={`notif-${s.event_type}`}
                          type="button"
                          role="switch"
                          aria-checked={s.enabled}
                          disabled={savingId === s.event_type}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
                            s.enabled ? "bg-primary" : "bg-muted"
                          }`}
                          onClick={async () => {
                            setSavingId(s.event_type);
                            try {
                              const updated =
                                await notificationsService.updateNotificationSettings(
                                  [
                                    {
                                      event_type: s.event_type,
                                      enabled: !s.enabled,
                                    },
                                  ]
                                );
                              setNotificationSettings((prev) =>
                                prev.map((x) =>
                                  x.event_type === s.event_type
                                    ? {
                                        ...x,
                                        enabled:
                                          updated[0]?.enabled ?? !s.enabled,
                                      }
                                    : x
                                )
                              );
                            } catch (e) {
                              console.error("Failed to update setting", e);
                            } finally {
                              setSavingId(null);
                            }
                          }}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                              s.enabled ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Settings */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              System Settings
            </CardTitle>
            <CardDescription>Configure system-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <select className="w-full p-2 border rounded-md">
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <select className="w-full p-2 border rounded-md">
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
              </select>
            </div>
            <Button>Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
