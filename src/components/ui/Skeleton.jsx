import { Skeleton as ShadSkeleton } from './skeleton';

const Skeleton = ({ height = 16, width = '100%', radius = 8, style = {} }) => (
  <ShadSkeleton height={height} width={width} radius={radius} style={style} />
);

export default Skeleton;
