// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/media.codecs/index.js
/// <reference path="./types.d.ts" />

type MediaCanPlayTypeResult = '' | 'maybe' | 'probably';

interface ParsedInput {
  mime: string;
  codecStr: string | undefined;
  codecs: string[];
}

(() => {
  /**
   * Input might look funky, we need to normalize it so e.g. whitespace isn't an issue.
   *
   * @example
   * video/webm; codecs="vp8, vorbis"
   * video/mp4; codecs="avc1.42E01E"
   * audio/x-m4a;
   * audio/ogg; codecs="vorbis"
   */
  const parseInput = (arg: string): ParsedInput => {
    const [mime, codecStr] = arg.trim().split(';') as [string, string | undefined];
    let codecs: string[] = [];
    if (codecStr?.includes('codecs="')) {
      codecs = codecStr
        .trim()
        .replace('codecs="', '')
        .replace('"', '')
        .trim()
        .split(',')
        .filter((x): x is string => !!x)
        .map((x) => x.trim());
    }
    return {
      mime: mime ?? '',
      codecStr,
      codecs,
    };
  };

  const canPlayType: ProxyHandler<HTMLMediaElement['canPlayType']> = {
    apply: function (
      target: HTMLMediaElement['canPlayType'],
      ctx: HTMLMediaElement,
      args: [string]
    ): MediaCanPlayTypeResult {
      if (!args.length) {
        return target.apply(ctx, args);
      }
      const { mime, codecs } = parseInput(args[0]);

      // This specific mp4 codec is missing in Chromium
      if (mime === 'video/mp4') {
        if (codecs.includes('avc1.42E01E')) {
          return 'probably';
        }
      }

      // This mimetype is only supported if no codecs are specified
      if (mime === 'audio/x-m4a' && !codecs.length) {
        return 'maybe';
      }

      // This mimetype is only supported if no codecs are specified
      if (mime === 'audio/aac' && !codecs.length) {
        return 'probably';
      }

      return target.apply(ctx, args);
    },
  };

  utils.replaceWithProxy(
    HTMLMediaElement.prototype as unknown as Record<string, unknown>,
    'canPlayType',
    canPlayType
  );
})();
