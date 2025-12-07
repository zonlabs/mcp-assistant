import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface A2ADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  a2aUrl: string;
  setA2AUrl: (url: string) => void;
  isValidating: boolean;
  onValidateAndSave: () => void;
}

export const A2ADialog = ({
  open,
  onOpenChange,
  a2aUrl,
  setA2AUrl,
  isValidating,
  onValidateAndSave,
}: A2ADialogProps) => {
  const handleClose = () => {
    setA2AUrl("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add A2A Agent</DialogTitle>
          <DialogDescription>
            Enter the agent URL to validate and connect to a remote A2A agent
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="url">Agent URL *</Label>
            <Input
              id="url"
              placeholder="http://localhost:9001"
              value={a2aUrl}
              onChange={(e) => setA2AUrl(e.target.value)}
              disabled={isValidating}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Agent name and description will be fetched automatically after validation
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isValidating}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={onValidateAndSave}
            disabled={isValidating || !a2aUrl.trim()}
            className="cursor-pointer"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              "Validate & Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
