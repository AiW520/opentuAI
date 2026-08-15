import { RectangleClient, type PlaitBoard } from '@plait/core';
import { createRoot, type Root } from 'react-dom/client';
import React from 'react';
import {
  IMAGE_GENERATION_ANCHOR_RETRY_EVENT,
  type ImageGenerationAnchorPhase,
  type PlaitImageGenerationAnchor,
} from '../../types/image-generation-anchor.types';
import { isTauriEnvironment } from '../../utils/tauri-env';
import { ImageGenerationAnchorContent } from './ImageGenerationAnchorContent';

const SVG_NS = 'http://www.w3.org/2000/svg';

const DESKTOP_PHASE_LABELS: Record<ImageGenerationAnchorPhase, string> = {
  submitted: '准备生成',
  queued: '等待执行',
  generating: '生成中',
  developing: '正在显影',
  inserting: '正在放入画布',
  completed: '已完成',
  failed: '生成失败',
};

const DESKTOP_PHASE_SUBTITLES: Record<ImageGenerationAnchorPhase, string> = {
  submitted: '正在创建图片生成任务',
  queued: '请求已受理，请稍候',
  generating: '图片正在生成，请稍候',
  developing: '结果已返回，正在处理图片',
  inserting: '正在把图片放入画布',
  completed: '图片已放入画布',
  failed: '图片生成失败',
};

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tagName);
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(1, maxLength - 1))}…`;
}

export class ImageGenerationAnchorGenerator {
  constructor(private board: PlaitBoard) {}

  private foreignObject: SVGForeignObjectElement | null = null;
  private htmlContainer: HTMLElement | null = null;
  private reactRoot: Root | null = null;
  private desktopFallback: SVGGElement | null = null;
  private renderTimer: number | null = null;

  processDrawing(
    element: PlaitImageGenerationAnchor,
    parentG: SVGGElement,
    selected: boolean
  ): SVGGElement {
    const g = createSvgElement('g');
    g.setAttribute('class', 'image-generation-anchor-element');
    parentG.appendChild(g);

    if (isTauriEnvironment()) {
      this.createDesktopFallback(element, g);
    } else {
      this.createForeignObject(element, g);
      // WebKit is sensitive to mounting a React root before foreignObject is
      // connected to the live SVG tree.
      this.renderTimer = window.setTimeout(() => {
        this.renderTimer = null;
        this.renderReact(element, selected);
      }, 0);
    }
    return g;
  }

  updateDrawing(
    element: PlaitImageGenerationAnchor,
    _g: SVGGElement,
    selected: boolean
  ): void {
    if (this.desktopFallback) {
      this.renderDesktopFallback(element);
      return;
    }

    this.updateForeignObject(element);
    this.renderReact(element, selected);
  }

  private createDesktopFallback(
    element: PlaitImageGenerationAnchor,
    g: SVGGElement
  ): void {
    this.desktopFallback = createSvgElement('g');
    this.desktopFallback.setAttribute(
      'class',
      'image-generation-anchor-desktop-fallback'
    );
    this.desktopFallback.style.pointerEvents = 'auto';
    g.appendChild(this.desktopFallback);
    this.renderDesktopFallback(element);
  }

  private renderDesktopFallback(element: PlaitImageGenerationAnchor): void {
    const host = this.desktopFallback;
    if (!host) {
      return;
    }

    host.replaceChildren();
    const rect = RectangleClient.getRectangleByPoints(element.points);
    const isFailed = element.phase === 'failed';
    const isCompleted = element.phase === 'completed';
    const accent = isFailed ? '#dc2626' : isCompleted ? '#15803d' : '#d97706';
    const background = isFailed
      ? '#fff1f2'
      : isCompleted
      ? '#f0fdf4'
      : '#fff7ed';
    const minDimension = Math.min(rect.width, rect.height);
    const compact = rect.width < 220 || rect.height < 120;
    const titleSize = compact ? 14 : 18;
    const bodySize = compact ? 11 : 13;
    const padding = compact ? 12 : 20;
    const progress =
      typeof element.progress === 'number'
        ? Math.max(0, Math.min(100, Math.round(element.progress)))
        : null;
    const phaseLabel =
      element.phase === 'generating' && progress != null
        ? `${progress}%`
        : DESKTOP_PHASE_LABELS[element.phase];
    const subtitle = isFailed
      ? element.error || DESKTOP_PHASE_SUBTITLES.failed
      : element.subtitle || DESKTOP_PHASE_SUBTITLES[element.phase];

    host.setAttribute(
      'aria-label',
      `${DESKTOP_PHASE_LABELS[element.phase]}：${subtitle}`
    );

    const backgroundRect = createSvgElement('rect');
    backgroundRect.setAttribute('x', String(rect.x));
    backgroundRect.setAttribute('y', String(rect.y));
    backgroundRect.setAttribute('width', String(rect.width));
    backgroundRect.setAttribute('height', String(rect.height));
    backgroundRect.setAttribute('rx', String(Math.min(18, minDimension / 8)));
    backgroundRect.setAttribute('fill', background);
    backgroundRect.setAttribute('stroke', accent);
    backgroundRect.setAttribute('stroke-width', '1.5');
    host.appendChild(backgroundRect);

    if (element.previewImageUrl) {
      const preview = createSvgElement('image');
      preview.setAttribute('x', String(rect.x));
      preview.setAttribute('y', String(rect.y));
      preview.setAttribute('width', String(rect.width));
      preview.setAttribute('height', String(rect.height));
      preview.setAttribute('href', element.previewImageUrl);
      preview.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      host.appendChild(preview);
    }

    const centerX = rect.x + rect.width / 2;
    const contentCenterY =
      rect.y + rect.height * (isFailed && !compact ? 0.38 : 0.45);

    if (!isFailed && !isCompleted && !compact) {
      const ringRadius = Math.max(22, Math.min(38, minDimension * 0.13));
      const ringBackground = createSvgElement('circle');
      ringBackground.setAttribute('cx', String(centerX));
      ringBackground.setAttribute('cy', String(contentCenterY));
      ringBackground.setAttribute('r', String(ringRadius));
      ringBackground.setAttribute('fill', '#ffffff');
      ringBackground.setAttribute('fill-opacity', '0.82');
      ringBackground.setAttribute('stroke', '#fed7aa');
      ringBackground.setAttribute('stroke-width', '6');
      host.appendChild(ringBackground);

      if (progress != null) {
        const circumference = 2 * Math.PI * ringRadius;
        const progressRing = createSvgElement('circle');
        progressRing.setAttribute('cx', String(centerX));
        progressRing.setAttribute('cy', String(contentCenterY));
        progressRing.setAttribute('r', String(ringRadius));
        progressRing.setAttribute('fill', 'none');
        progressRing.setAttribute('stroke', accent);
        progressRing.setAttribute('stroke-width', '6');
        progressRing.setAttribute('stroke-linecap', 'round');
        progressRing.setAttribute('stroke-dasharray', String(circumference));
        progressRing.setAttribute(
          'stroke-dashoffset',
          String(circumference * (1 - progress / 100))
        );
        progressRing.setAttribute(
          'transform',
          `rotate(-90 ${centerX} ${contentCenterY})`
        );
        host.appendChild(progressRing);
      }
    }

    const title = createSvgElement('text');
    title.setAttribute('x', String(centerX));
    title.setAttribute(
      'y',
      String(
        !isFailed && !isCompleted && !compact
          ? contentCenterY + 6
          : contentCenterY
      )
    );
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('dominant-baseline', 'middle');
    title.setAttribute('fill', isFailed ? '#991b1b' : '#7c2d12');
    title.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, sans-serif'
    );
    title.setAttribute('font-size', String(titleSize));
    title.setAttribute('font-weight', '650');
    title.textContent = phaseLabel;
    host.appendChild(title);

    if (!compact) {
      const maxChars = Math.max(
        12,
        Math.floor((rect.width - padding * 2) / 13)
      );
      const description = createSvgElement('text');
      description.setAttribute('x', String(centerX));
      description.setAttribute(
        'y',
        String(
          isFailed
            ? contentCenterY + 42
            : contentCenterY + Math.max(58, minDimension * 0.2)
        )
      );
      description.setAttribute('text-anchor', 'middle');
      description.setAttribute('fill', isFailed ? '#b91c1c' : '#92400e');
      description.setAttribute(
        'font-family',
        '-apple-system, BlinkMacSystemFont, sans-serif'
      );
      description.setAttribute('font-size', String(bodySize));
      description.textContent = truncateText(subtitle, maxChars);
      host.appendChild(description);
    }

    if (isFailed && rect.width >= 180 && rect.height >= 120) {
      const buttonWidth = Math.min(92, (rect.width - padding * 2 - 10) / 2);
      const buttonHeight = 32;
      const buttonY = rect.y + rect.height - padding - buttonHeight;
      const retryX = centerX - buttonWidth - 5;
      const closeX = centerX + 5;

      this.appendDesktopActionButton(
        host,
        retryX,
        buttonY,
        buttonWidth,
        buttonHeight,
        '重试',
        accent,
        () => {
          const taskId = element.primaryTaskId || element.taskIds[0];
          window.dispatchEvent(
            new CustomEvent(IMAGE_GENERATION_ANCHOR_RETRY_EVENT, {
              detail: { taskId, anchorId: element.id },
            })
          );
        }
      );
      this.appendDesktopActionButton(
        host,
        closeX,
        buttonY,
        buttonWidth,
        buttonHeight,
        '关闭',
        '#7f1d1d',
        () => this.board.deleteFragment([element]),
        true
      );
    }
  }

  private appendDesktopActionButton(
    host: SVGGElement,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: string,
    action: () => void,
    secondary = false
  ): void {
    const button = createSvgElement('g');
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', label);
    button.setAttribute('tabindex', '0');
    button.style.cursor = 'pointer';
    button.style.pointerEvents = 'auto';

    const buttonRect = createSvgElement('rect');
    buttonRect.setAttribute('x', String(x));
    buttonRect.setAttribute('y', String(y));
    buttonRect.setAttribute('width', String(width));
    buttonRect.setAttribute('height', String(height));
    buttonRect.setAttribute('rx', '7');
    buttonRect.setAttribute('fill', secondary ? '#ffffff' : color);
    buttonRect.setAttribute('stroke', color);
    buttonRect.setAttribute('stroke-width', '1');
    button.appendChild(buttonRect);

    const buttonText = createSvgElement('text');
    buttonText.setAttribute('x', String(x + width / 2));
    buttonText.setAttribute('y', String(y + height / 2));
    buttonText.setAttribute('text-anchor', 'middle');
    buttonText.setAttribute('dominant-baseline', 'middle');
    buttonText.setAttribute('fill', secondary ? color : '#ffffff');
    buttonText.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, sans-serif'
    );
    buttonText.setAttribute('font-size', '12');
    buttonText.setAttribute('font-weight', '600');
    buttonText.textContent = label;
    button.appendChild(buttonText);

    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      action();
    });
    host.appendChild(button);
  }

  private createForeignObject(
    element: PlaitImageGenerationAnchor,
    g: SVGGElement
  ): void {
    const rect = RectangleClient.getRectangleByPoints(element.points);

    this.foreignObject = createSvgElement('foreignObject');
    this.foreignObject.setAttribute('x', String(rect.x));
    this.foreignObject.setAttribute('y', String(rect.y));
    this.foreignObject.setAttribute('width', String(rect.width));
    this.foreignObject.setAttribute('height', String(rect.height));
    this.foreignObject.style.overflow = 'visible';
    this.foreignObject.style.pointerEvents = 'auto';

    this.htmlContainer = document.createElementNS(
      'http://www.w3.org/1999/xhtml',
      'div'
    ) as HTMLElement;
    this.htmlContainer.className = 'image-generation-anchor-host';
    this.htmlContainer.style.cssText = `
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      display: block;
      pointer-events: auto;
      overflow: visible;
    `;

    this.foreignObject.appendChild(this.htmlContainer);
    g.appendChild(this.foreignObject);
  }

  private updateForeignObject(element: PlaitImageGenerationAnchor): void {
    if (!this.foreignObject) {
      return;
    }

    const rect = RectangleClient.getRectangleByPoints(element.points);
    this.foreignObject.setAttribute('x', String(rect.x));
    this.foreignObject.setAttribute('y', String(rect.y));
    this.foreignObject.setAttribute('width', String(rect.width));
    this.foreignObject.setAttribute('height', String(rect.height));
  }

  private renderReact(
    element: PlaitImageGenerationAnchor,
    selected: boolean
  ): void {
    if (!this.htmlContainer) {
      return;
    }

    if (!this.reactRoot) {
      this.reactRoot = createRoot(this.htmlContainer);
    }

    this.reactRoot.render(
      React.createElement(ImageGenerationAnchorContent, {
        board: this.board,
        element,
        selected,
      })
    );
  }

  destroy(): void {
    if (this.renderTimer != null) {
      window.clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }

    if (this.reactRoot) {
      const root = this.reactRoot;
      this.reactRoot = null;
      setTimeout(() => {
        try {
          root.unmount();
        } catch {
          // Ignore unmount failures during teardown.
        }
      }, 0);
    }

    this.foreignObject = null;
    this.htmlContainer = null;
    this.desktopFallback = null;
  }
}
