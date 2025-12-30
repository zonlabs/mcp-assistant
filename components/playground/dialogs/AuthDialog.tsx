import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Lock } from "lucide-react";
import React from "react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AuthDialog: React.FC<AuthDialogProps> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[380px]">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-full bg-gray-100 dark:bg-zinc-800">
            <Lock className="h-4 w-4 text-gray-900 dark:text-white" />
          </div>
          <DialogTitle className="text-base">Sign In Required</DialogTitle>
        </div>
        <DialogDescription className="text-sm leading-relaxed">
          Sign in to start chatting with the AI assistant.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-row gap-2 sm:gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1 cursor-pointer"
        >
          Cancel
        </Button>
        <Link href="/signin" className="flex-1">
          <Button className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black cursor-pointer">
            Sign In
          </Button>
        </Link>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default AuthDialog;
