// https://github.com/berstend/puppeteer-extra/blob/c44c8bb0224c6bba2554017bfb9d7a1d0119f92f/packages/puppeteer-extra-plugin-stealth/evasions/media.codecs/index.js
/// <reference path="./types.d.ts" />
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
    const parseInput = (arg) => {
        const [mime, codecStr] = arg.trim().split(';');
        let codecs = [];
        if (codecStr?.includes('codecs="')) {
            codecs = codecStr
                .trim()
                .replace('codecs="', '')
                .replace('"', '')
                .trim()
                .split(',')
                .filter((x) => !!x)
                .map((x) => x.trim());
        }
        return {
            mime: mime ?? '',
            codecStr,
            codecs,
        };
    };
    const canPlayType = {
        apply: function (target, ctx, args) {
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
    utils.replaceWithProxy(HTMLMediaElement.prototype, 'canPlayType', canPlayType);
})();
