import { describe, expect, it } from 'vitest';
import {
  classifyError,
  ErrorCategory,
  formatFriendlyError,
} from './error-classifier';

describe('media executor error classifier', () => {
  it('classifies a Chinese invalid-token response as an auth error', () => {
    const error = new Error(
      '无效的令牌 (request id: 202608121035242123055458268d9d6T2i6mVYT)'
    );

    expect(classifyError(error, 'image')).toMatchObject({
      category: ErrorCategory.AUTH,
      retryable: false,
      requestId: '202608121035242123055458268d9d6T2i6mVYT',
      friendlyMessage:
        '图片生成失败：API Key 无效或已过期，请在设置页面检查并更新 API Key',
    });
  });

  it('keeps the upstream request ID in the visible friendly message', () => {
    const message = formatFriendlyError(
      new Error('invalid token (request_id=req_image_123456)'),
      'image'
    );

    expect(message).toBe(
      '图片生成失败：API Key 无效或已过期，请在设置页面检查并更新 API Key（请求 ID：req_image_123456）'
    );
  });

  it('still classifies auth failures carried by a TypeError as auth errors', () => {
    const error = new TypeError('Unauthorized: invalid API key');

    expect(classifyError(error).category).toBe(ErrorCategory.AUTH);
  });
});
