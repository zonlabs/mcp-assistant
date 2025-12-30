import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import React from "react";
import { Session } from "@supabase/supabase-js";

export interface MicrophoneButtonProps {
  pushToTalkState: string;
  onPushToTalkStateChange?: (state: string) => void;
  session?: Session | null;
  disabled?: boolean;
  setShowAuthDialog?: (open: boolean) => void;
}

const getMicrophoneIcon = (pushToTalkState: string) => {
  if (pushToTalkState === "recording") {
    return <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
  } else if (pushToTalkState === "transcribing") {
    return <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />;
  }
  return <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
};

const getMicrophoneColor = (pushToTalkState: string) => {
  if (pushToTalkState === "recording") {
    return "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 animate-pulse";
  } else if (pushToTalkState === "transcribing") {
    return "bg-gray-600 hover:bg-gray-700 dark:bg-zinc-600 dark:hover:bg-zinc-500";
  }
  return "bg-gray-500 hover:bg-gray-600 dark:bg-zinc-600 dark:hover:bg-zinc-500";
};

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  pushToTalkState,
  onPushToTalkStateChange,
  session,
  disabled = false,
  setShowAuthDialog,
}) => {
  if (!onPushToTalkStateChange) return null;

  const handleMicrophoneClick = () => {
    if (!session) {
      setShowAuthDialog?.(true);
      return;
    }
    if (pushToTalkState === "idle") {
      onPushToTalkStateChange("recording");
    } else if (pushToTalkState === "recording") {
      onPushToTalkStateChange("idle");
    }
  };

  return (
    <Button
      onClick={handleMicrophoneClick}
      disabled={disabled || pushToTalkState === "transcribing"}
      className={`${getMicrophoneColor(pushToTalkState)} disabled:opacity-50
        text-white rounded-lg p-1.5 sm:p-2 h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center
        transition-all duration-200 shadow-lg mr-1 sm:mr-2 cursor-pointer disabled:cursor-not-allowed`}
      title={
        pushToTalkState === "recording"
          ? "Stop recording"
          : pushToTalkState === "transcribing"
            ? "Transcribing..."
            : "Start voice recording"
      }
    >
      {getMicrophoneIcon(pushToTalkState)}
    </Button>
  );
};

export default MicrophoneButton;
