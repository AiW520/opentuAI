export const OPEN_IMAGE_RECOVERY = 'opentu:open-image-recovery';
export const INSERT_WORKFLOW_RECOVERED_IMAGE = 'opentu:insert-recovered-image';

export class RecoveredImageSaveError extends Error {}

export interface WorkflowRecoveredImageRequest {
  url: string;
  path: string;
  handled: boolean;
  resolve: (result?: { remoteOnly?: boolean }) => void;
  reject: (error: Error) => void;
}

export function insertWorkflowRecoveredImage(url: string): Promise<{ remoteOnly?: boolean } | undefined> {
  return new Promise((resolve, reject) => {
    const request: WorkflowRecoveredImageRequest = { url, path: window.location.pathname, handled: false, resolve, reject };
    window.dispatchEvent(new CustomEvent(INSERT_WORKFLOW_RECOVERED_IMAGE, { detail: request }));
    if (!request.handled) reject(new Error('请先打开无限画布项目'));
  });
}
