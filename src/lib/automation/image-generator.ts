/**
 * Legacy automation image module — delegates to the image pipeline orchestrator.
 */
export {
  resolveAutomationArticleImage,
  generateAutomationArticleImage,
} from "@/lib/image-pipeline/orchestrator";

export { hostSourceImageOnFirebase } from "@/lib/image-pipeline/host-source";

export { isUsableFirebaseImageUrl } from "@/lib/image-pipeline/optimizer";
