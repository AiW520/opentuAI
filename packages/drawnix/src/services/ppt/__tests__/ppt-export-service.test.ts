import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RectangleClient } from '@plait/core';
import type { PlaitBoard, PlaitElement } from '@plait/core';
import type { PlaitFrame } from '../../../types/frame.types';

const pptxMockState = vi.hoisted(() => ({
  instances: [] as Array<{
    slide: {
      addImage: ReturnType<typeof vi.fn>;
      addMedia: ReturnType<typeof vi.fn>;
      addText: ReturnType<typeof vi.fn>;
      addShape: ReturnType<typeof vi.fn>;
    };
    addSlide: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
    ShapeType: Record<string, string>;
  }>,
}));

vi.mock('../../../utils/download-utils', () => ({ smartDownload: vi.fn(async () => ({ downloadedCount: 1, openedCount: 0, failedCount: 0 })) }));

vi.mock('pptxgenjs', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      const slide = {
        addImage: vi.fn(),
        addMedia: vi.fn(),
        addText: vi.fn(),
        addShape: vi.fn(),
      };
      const instance = {
        slide,
        addSlide: vi.fn(() => slide),
        write: vi.fn(async () => new Blob(['pptx'])),
        writeFile: vi.fn(async () => undefined),
        ShapeType: {
          line: 'line',
          rect: 'rect',
          roundRect: 'roundRect',
          ellipse: 'ellipse',
          diamond: 'diamond',
          triangle: 'triangle',
          parallelogram: 'parallelogram',
          trapezoid: 'trapezoid',
          hexagon: 'hexagon',
          star4: 'star4',
          star5: 'star5',
          cloud: 'cloud',
          custGeom: 'custGeom',
        },
      };
      pptxMockState.instances.push(instance);
      return instance;
    }),
  };
});

const frame: PlaitFrame = {
  id: 'frame-1',
  type: 'frame',
  name: 'PPT 页面 1',
  points: [
    [0, 0],
    [1600, 900],
  ],
  children: [],
};

function createBoard(elements: PlaitElement[]): PlaitBoard {
  return {
    children: [frame, ...elements],
    getRectangle: (element: PlaitElement) =>
      RectangleClient.getRectangleByPoints((element as any).points),
    isRecursion: () => false,
  } as unknown as PlaitBoard;
}

function createImageElement(
  overrides: Partial<PlaitElement & Record<string, unknown>>
): PlaitElement {
  return {
    id: 'image-1',
    type: 'image',
    angle: 0,
    points: [
      [160, 90],
      [960, 540],
    ],
    children: [],
    ...overrides,
  } as unknown as PlaitElement;
}

function createAudioElement(
  overrides: Partial<PlaitElement & Record<string, unknown>> = {}
): PlaitElement {
  return {
    id: 'audio-1',
    type: 'audio',
    points: [
      [160, 90],
      [660, 260],
    ],
    audioUrl: '/media/song.mp3',
    title: 'Song',
    createdAt: Date.now(),
    children: [],
    ...overrides,
  } as unknown as PlaitElement;
}

function mockFetchBlob(blob: Blob, init?: ResponseInit) {
  global.fetch = vi.fn(async () => new Response(blob, init)) as any;
}

describe('ppt-export-service media export', () => {
  beforeEach(() => {
    pptxMockState.instances.length = 0;
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:ppt-test');
    URL.revokeObjectURL = vi.fn();
    mockFetchBlob(new Blob(['media-bytes'], { type: 'video/mp4' }), {
      headers: {
        'content-type': 'video/mp4',
        'content-length': '11',
      },
    });
  });

  it('embeds video image elements as PPT media instead of skipping them', async () => {
    const { exportFramesToPPT } = await import('../ppt-export-service');
    const video = createImageElement({
      url: '/media/clip.mp4#video',
      isVideo: true,
      videoType: 'video',
      poster: 'data:image/png;base64,dmlkZW8tY292ZXI=',
    });

    await exportFramesToPPT(createBoard([video]), [frame], {
      fileName: 'media-test',
    });

    const slide = pptxMockState.instances[0].slide;
    expect(global.fetch).toHaveBeenCalledWith('/media/clip.mp4', {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    expect(slide.addMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'video',
        extn: 'mp4',
        cover: 'data:image/png;base64,dmlkZW8tY292ZXI=',
        data: expect.stringMatching(/^data:video\/mp4;base64,/),
      })
    );
    expect(slide.addImage).not.toHaveBeenCalled();
  });

  it('embeds audio nodes as PPT media', async () => {
    mockFetchBlob(new Blob(['audio-bytes'], { type: 'audio/mpeg' }), {
      headers: {
        'content-type': 'audio/mpeg',
        'content-length': '11',
      },
    });
    const { exportFramesToPPT } = await import('../ppt-export-service');

    await exportFramesToPPT(
      createBoard([
        createAudioElement({
          previewImageUrl: 'data:image/png;base64,YXVkaW8tY292ZXI=',
        }),
      ]),
      [frame],
      {
        fileName: 'audio-test',
      }
    );

    const slide = pptxMockState.instances[0].slide;
    expect(slide.addMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audio',
        extn: 'mp3',
        objectName: 'Song',
        cover: 'data:image/png;base64,YXVkaW8tY292ZXI=',
        data: expect.stringMatching(/^data:audio\/mpeg;base64,/),
      })
    );
  });

  it('embeds legacy audio image cards by audioUrl before normal image export', async () => {
    mockFetchBlob(new Blob(['audio-bytes'], { type: 'audio/mpeg' }), {
      headers: {
        'content-type': 'audio/mpeg',
        'content-length': '11',
      },
    });
    const { exportFramesToPPT } = await import('../ppt-export-service');
    const legacyAudioCard = createImageElement({
      url: 'data:image/svg+xml,%3Csvg%20/%3E',
      isAudio: true,
      audioType: 'music-card',
      audioUrl: '/media/legacy.mp3',
      audioTitle: 'Legacy Song',
    });

    await exportFramesToPPT(createBoard([legacyAudioCard]), [frame], {
      fileName: 'legacy-audio-test',
    });

    const slide = pptxMockState.instances[0].slide;
    expect(slide.addMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audio',
        objectName: 'Legacy Song',
      })
    );
    expect(slide.addImage).not.toHaveBeenCalled();
  });

  it('falls back to a visible placeholder when media exceeds the size limit', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(new Blob(['large'], { type: 'video/mp4' }), {
          headers: {
            'content-type': 'video/mp4',
            'content-length': '6',
          },
        })
    ) as any;
    const { exportFramesToPPT } = await import('../ppt-export-service');
    const video = createImageElement({
      url: '/media/large.mp4#video',
      isVideo: true,
      videoType: 'video',
      poster: 'data:image/png;base64,cG9zdGVy',
    });

    await exportFramesToPPT(createBoard([video]), [frame], {
      fileName: 'oversized-test',
      mediaSizeLimitBytes: 3,
    });

    const slide = pptxMockState.instances[0].slide;
    expect(slide.addMedia).not.toHaveBeenCalled();
    expect(slide.addImage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: 'data:image/png;base64,cG9zdGVy',
      })
    );
    expect(slide.addText).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        fill: { color: '0F172A', transparency: 18 },
        line: { color: 'CBD5E1', width: 0.5 },
      })
    );
  });
});
