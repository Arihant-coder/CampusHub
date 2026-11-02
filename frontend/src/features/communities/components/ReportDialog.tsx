import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { communitiesService } from "../services";

const REPORT_REASONS = [
  "Spam or irrelevant advertising",
  "Harassment, abuse, or hate speech",
  "Misinformation or misleading academic material",
  "Inappropriate or offensive content",
  "Copyright violation or uncredited work",
  "Other violation of community guidelines",
];

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  targetType: "post" | "comment" | "note";
  targetId: string;
  targetTitle?: string;
  onSuccess?: () => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({
  open,
  onOpenChange,
  subjectId,
  targetType,
  targetId,
  targetTitle,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedReason) {
      toast.error("Please select a reason for reporting.");
      return;
    }

    const trimmedDetails = details.trim();
    const finalReason = trimmedDetails
      ? `${selectedReason}: ${trimmedDetails}`
      : selectedReason;

    try {
      setIsSubmitting(true);
      if (communitiesService.createReport) {
        const res = await communitiesService.createReport({
          subjectId,
          targetType,
          targetId,
          reason: finalReason,
        });

        if (res && res.error) {
          toast.error(res.error.message || "Failed to submit report.");
          return;
        }
      }

      toast.success("Thank you. Report submitted to moderators for review.");
      setDetails("");
      setSelectedReason(REPORT_REASONS[0]);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="sm:max-w-[480px]"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Report {targetType}</DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
            {targetTitle ? (
              <>
                Reporting <span className="font-medium text-foreground">&ldquo;{targetTitle}&rdquo;</span>. Reports are sent directly to community moderators.
              </>
            ) : (
              `Help our moderation team keep CampusHub safe and constructive by reporting violations.`
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="report-reason" className="text-xs font-semibold">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedReason}
              onValueChange={setSelectedReason}
              disabled={isSubmitting}
            >
              <SelectTrigger id="report-reason" className="w-full text-xs sm:text-sm">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason} className="text-xs sm:text-sm">
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-details" className="text-xs font-semibold">
              Additional context (optional)
            </Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any context that will help moderators evaluate this report..."
              rows={3}
              maxLength={500}
              className="resize-none text-xs sm:text-sm"
              disabled={isSubmitting}
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {details.length}/500 characters
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              className="cursor-pointer gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
