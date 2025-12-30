import { PlaygroundProvider } from "@/components/providers/PlaygroundProvider";
import { CopilotKit } from "@copilotkit/react-core";
import type { PropsWithChildren } from "react";

export default function PlaygroundLayout({ children }: PropsWithChildren) {
  return (
    <CopilotKit
      // publicApiKey="ck_pub_25f0c954d92a58b0921a536c7c4466b1"
      agent="mcpAssistant"
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
      transcribeAudioUrl="/api/transcribe"
      textToSpeechUrl="/api/tts"
    >
      <PlaygroundProvider>
        {children}
      </PlaygroundProvider>
    </CopilotKit>
  );
}
