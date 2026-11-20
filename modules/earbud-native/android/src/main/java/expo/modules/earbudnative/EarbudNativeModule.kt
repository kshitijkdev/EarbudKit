package expo.modules.earbudnative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EarbudNativeModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("EarbudNative")

        // Placeholder - will be fully implemented in Stage 2
        AsyncFunction("getBondedAudioDevices") {
            emptyList<Map<String, Any>>()
        }
    }
}
