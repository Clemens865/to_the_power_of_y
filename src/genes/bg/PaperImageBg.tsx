import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { HalftoneDots, HalftoneCmyk, ImageDithering, FlutedGlass, Heatmap, LensDistortion } from '@paper-design/shaders-react';
import { paintPaperImage, type PaperImageStyle } from './paperImage';

// Paper Shaders that filter an image. The picture is painted per universe from the palette (see paperImage.ts);
// the genome only carries its recipe (imageSeed/style/colours), so it stays JSON.
// This file is lazy-loaded; @paper-design/shaders-react is the same chunk the other Paper backgrounds use.
const SHADERS: Record<string, ComponentType<any>> = { HalftoneDots, HalftoneCmyk, ImageDithering, FlutedGlass, Heatmap, LensDistortion };

interface Props {
  shader: string;
  imageSeed: number;
  imageStyle: PaperImageStyle;
  imageColors: string[];
  imageBack: string | null;
  [prop: string]: unknown;
}

const FILL = { width: '100%', height: '100%' };
// Paper defaults to ≥2× DPR up to 8 Mpx. Cap at 1.5× the viewport's CSS pixels and 2 Mpx
// (maxPixelCount is what binds: Paper measures physical pixels via devicePixelContentBox).
const pixels = () => ({ minPixelRatio: 1, maxPixelCount: Math.round(Math.min(1920 * 1080, innerWidth * innerHeight * 2.25)) });

export default function PaperImageBg({ shader, imageSeed, imageStyle, imageColors, imageBack, ...rest }: Props) {
  const src = useMemo(
    () => paintPaperImage({ imageSeed, imageStyle, imageColors, imageBack }),
    [imageSeed, imageStyle, imageBack, imageColors]
  );
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = src;
    img
      .decode()
      .then(() => alive && setImage(img))
      .catch(() => alive && setImage(img));
    return () => {
      alive = false;
    };
  }, [src]);

  const Shader = SHADERS[shader];
  if (!Shader || !image) return <div style={FILL} />;
  return <Shader {...rest} {...pixels()} image={image} style={FILL} />;
}
