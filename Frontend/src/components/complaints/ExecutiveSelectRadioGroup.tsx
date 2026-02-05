/**
 * Reusable officer/executive selection: horizontal scrollable radio group
 * with the same design as Draft Letter "Select Executive to Address".
 * Use in: draft letter tab, change officer (draft), change assigned officer (actions).
 */

import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, Phone, MapPin } from "lucide-react";

export interface ExecutiveItem {
  name?: string;
  designation?: string;
  district?: string;
  email?: string;
  phone?: string;
  office_address?: string;
}

export interface ExecutiveSelectRadioGroupProps {
  /** List of officers/executives */
  executives: ExecutiveItem[];
  /** Currently selected index */
  value: number;
  /** Called when selection changes */
  onValueChange: (index: number) => void;
  /** Optional title above the list (e.g. "Select Executive to Address (8 available):") */
  title?: string;
  /** Prefix for radio input ids to avoid collisions when multiple on page */
  idPrefix?: string;
  /** Optional ref for the scroll container (e.g. for scroll buttons) */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  /** Optional scroll handler (e.g. to update scroll button state) */
  onScroll?: () => void;
  /** Optional class for the outer wrapper */
  className?: string;
  /** Accessibility label for the radio group */
  ariaLabel?: string;
}

export function ExecutiveSelectRadioGroup({
  executives,
  value,
  onValueChange,
  title,
  idPrefix = "executive",
  scrollRef,
  onScroll,
  className = "",
  ariaLabel = "Select executive to address",
}: ExecutiveSelectRadioGroupProps) {
  const selectedIndex = value >= 0 && value < executives.length ? value : -1;
  const radioValue = selectedIndex >= 0 ? selectedIndex.toString() : "__none__";

  return (
    <div className={className}>
      {title && (
        <Label className="font-semibold text-lg text-foreground mb-4 block">
          {title}
        </Label>
      )}
      <div className="relative w-full overflow-y-hidden">
        <div
          ref={scrollRef as React.RefObject<HTMLDivElement>}
          onScroll={onScroll}
          className="w-full min-w-0 scrollbar-hide pb-4 px-12"
          style={{ scrollBehavior: "smooth" }}
        >
          <RadioGroup
            value={radioValue}
            onValueChange={(v) =>
              v && v !== "__none__" ? onValueChange(parseInt(v, 10)) : undefined
            }
            className="inline-block min-w-0"
            aria-label={ariaLabel}
          >
            <div className="flex gap-4 w-max">
              {executives.map((exec, index) => (
                <div key={index} className="w-[320px] flex-shrink-0">
                  <RadioGroupItem
                    value={index.toString()}
                    id={`${idPrefix}-${index}`}
                    className="peer sr-only"
                    aria-hidden
                  />
                  <Label
                    htmlFor={`${idPrefix}-${index}`}
                    className="flex flex-col p-4 border-2 rounded-xl cursor-pointer hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-4 peer-data-[state=checked]:ring-primary/20 peer-data-[state=checked]:bg-gradient-to-br peer-data-[state=checked]:from-primary/5 peer-data-[state=checked]:to-orange-50 h-full"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base text-foreground mb-1">
                          {exec.name || "Unknown"}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          {exec.designation}
                          {exec.district ? ` - ${exec.district}` : ""}
                        </div>
                        <div className="space-y-1.5 text-sm">
                          {exec.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span className="truncate">{exec.email}</span>
                            </div>
                          )}
                          {exec.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span>{exec.phone}</span>
                            </div>
                          )}
                          {exec.office_address && (
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-xs">
                                {exec.office_address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}
