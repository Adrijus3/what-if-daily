import React from 'react';
import {Composition, AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender} from 'remotion';
import {drawFrameSmooth} from './frame';
import {OUT_FPS, W, H, TIMELINE} from './anim';

const Story: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [handle] = React.useState(() => delayRender('font'));
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const f = new FontFace('Lilita One', `url(${staticFile('lilita.woff2')})`);
    f.load().then((ff) => { (document as any).fonts.add(ff); setReady(true); continueRender(handle); }).catch(() => { setReady(true); continueRender(handle); });
  }, [handle]);
  React.useLayoutEffect(() => {
    if (!ready) return;
    drawFrameSmooth(ref.current!.getContext('2d')!, frame / fps, fps);
  }, [frame, fps, ready]);
  return (
    <AbsoluteFill style={{background: '#0c0714'}}>
      <canvas ref={ref} width={W} height={H} style={{width: W, height: H}} />
    </AbsoluteFill>
  );
};
export const Root: React.FC = () => (
  <Composition id="Story" component={Story} width={W} height={H} fps={OUT_FPS} durationInFrames={Math.round(TIMELINE.duration * OUT_FPS)} />
);
