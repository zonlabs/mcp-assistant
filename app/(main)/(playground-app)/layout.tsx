import { PlaygroundProvider } from "@/components/providers/PlaygroundProvider";
import { CopilotKit } from "@copilotkit/react-core";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";
import type { PropsWithChildren } from "react";
import { ToolRenderer } from "@/components/playground/ToolRenderer";

export default function PlaygroundAppLayout({ children }: PropsWithChildren) {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <CopilotKit
        // publicApiKey="ck_pub_25f0c954d92a58b0921a536c7c4466b1"
        publicLicenseKey="ck_pub_25f0c954d92a58b0921a536c7c4466b1"
        agent="mcpAssistant"
        runtimeUrl="/api/copilotkit"
        showDevConsole={false}
        transcribeAudioUrl="/api/transcribe"
        textToSpeechUrl="/api/tts"
        renderToolCalls={[ToolRenderer]}

      >
        <PlaygroundProvider>
          <div className="flex h-screen bg-background text-foreground">
            <PlaygroundSidebar />
            <main className="flex-1 flex flex-col relative overflow-hidden">
              {children}
            </main>
          </div>
        </PlaygroundProvider>
      </CopilotKit>
    </div>
  );
}
